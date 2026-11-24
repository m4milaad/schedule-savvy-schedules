from __future__ import annotations

import json
import logging
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import faiss
import numpy as np
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INDEX_PATH = DATA_DIR / "faiss_index.bin"
META_PATH = DATA_DIR / "metadata.json"
API_PAGES = DATA_DIR / "api_crawl" / "pages.jsonl"
API_DOCS = DATA_DIR / "api_crawl" / "docs"

CHUNK_SIZE = 400
OVERLAP = 80
# Created only when /data is empty; must not be mixed with scraped *.txt or titles show "bootstrap kb"
BOOTSTRAP_KB = "bootstrap_kb.txt"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("ingest")
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?(?:\d[\s-]?){10,13}")
TABLE_LINE_RE = re.compile(r"(\|)|(\t)|(\s{2,})")
TITLE_CLEAN_RE = re.compile(r"\s+")


def _extract_url(text: str) -> str:
    match = re.search(r"https?://[^\s)>\"]+", text)
    return match.group(0) if match else ""


def _token_chunk(token_ids: list[int], chunk_size: int, overlap: int) -> list[list[int]]:
    chunks: list[list[int]] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(token_ids), step):
        end = start + chunk_size
        piece = token_ids[start:end]
        if len(piece) < 40:
            continue
        chunks.append(piece)
        if end >= len(token_ids):
            break
    return chunks


def _load_txt(path: Path) -> tuple[str, dict[str, str]]:
    """Load a TXT file produced by scrape_cuk.py, preserving its header metadata.

    scrape_cuk.py writes:
        Source URL: ...
        Page Title: ...
        Date Scraped: ...

    We prefer those header values over any URLs we might regex from the body.
    """
    raw = path.read_text(encoding="utf-8", errors="ignore")
    lines = raw.splitlines()

    header_source_url = ""
    header_title = ""
    header_date = ""
    for line in lines[:8]:
        if line.startswith("Source URL:"):
            header_source_url = line.removeprefix("Source URL:").strip()
        elif line.startswith("Page Title:"):
            header_title = line.removeprefix("Page Title:").strip()
        elif line.startswith("Date Scraped:"):
            header_date = line.removeprefix("Date Scraped:").strip()

    # Fallbacks for older files or non-standard inputs.
    source_url = header_source_url or _extract_url(raw) or f"file://{path.name}"
    page_title = header_title or path.stem.replace("_", " ").strip()
    date_scraped = header_date or datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()

    return raw, {
        "source_url": source_url,
        "page_title": page_title,
        "date_scraped": date_scraped,
    }


_MIN_PDF_TEXT_CHARS = 64


def _extract_pdf_pymupdf(path: Path) -> str:
    """Second-pass text extract; often succeeds when pypdf returns nothing (encoding/layout)."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(path)
        parts: list[str] = []
        try:
            for page in doc:
                t = (page.get_text() or "").strip()
                if t:
                    parts.append(t)
        finally:
            doc.close()
        return "\n\n".join(parts)
    except Exception as exc:
        logger.debug("PyMuPDF extract failed for %s: %s", path.name, exc)
        return ""


def _load_pdf(path: Path) -> tuple[str, dict[str, str]] | None:
    """Read *internal* PDF text layers (not OCR). Scanned image-only PDFs may still yield nothing."""
    joined = ""
    try:
        reader = PdfReader(str(path))
        pages: list[str] = []
        for page in reader.pages:
            text = (page.extract_text() or "").strip()
            if text:
                pages.append(text)
        joined = "\n\n".join(pages)
    except Exception as exc:
        logger.warning("pypdf failed for %s (%s); trying PyMuPDF", path.name, exc)
        joined = ""

    if len(joined.strip()) < _MIN_PDF_TEXT_CHARS:
        alt = _extract_pdf_pymupdf(path)
        if len(alt.strip()) > len(joined.strip()):
            logger.info("Using PyMuPDF text for %s (pypdf text too short)", path.name)
            joined = alt

    if not joined.strip():
        return None

    try:
        # Use stable local provenance for PDFs. Extracted body URLs are often unrelated outlinks.
        source_url = f"file://{path.name}"
        page_title = path.stem.replace("_", " ").strip()
        date_scraped = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
        return joined, {
            "source_url": source_url,
            "page_title": page_title,
            "date_scraped": date_scraped,
        }
    except Exception as exc:
        logger.warning("Skipping unreadable PDF: %s (%s)", path.name, exc)
        return None


def _load_api_crawl() -> list[tuple[str, dict[str, str], str]]:
    """Keep/follow pages from scripts/api_crawl.py, plus the PDFs `api_crawl.py --docs` downloaded for them."""
    from api_crawl import doc_filename  # same folder; python puts scripts/ on sys.path

    items: list[tuple[str, dict[str, str], str]] = []
    seen_docs: set[str] = set()
    missing = 0
    for line in API_PAGES.open(encoding="utf-8"):
        rec = json.loads(line)
        if rec["group"] not in ("keep", "follow"):
            continue
        # "updated" is the site's own last-edit date: a better freshness signal than when we crawled it.
        date = rec.get("updated") or datetime.now(timezone.utc).date().isoformat()
        title = rec["title"]
        if rec["text"].strip():
            body = rec["text"] if rec["text"].startswith(title) else f"{title}\n\n{rec['text']}"
            items.append((body, {"source_url": rec["url"], "page_title": title, "date_scraped": date}, f"page {title!r}"))
        for url in rec["documents"]:
            if url in seen_docs or not url.lower().endswith(".pdf"):
                continue
            seen_docs.add(url)
            path = API_DOCS / doc_filename(url)
            if not path.exists():
                missing += 1
                continue
            loaded = _load_pdf(path)
            if loaded is None:  # scanned PDF with no text layer
                continue
            name = re.sub(r"^\d{10,}-", "", unquote(url.rsplit("/", 1)[-1].rsplit(".", 1)[0]))  # drop upload-timestamp prefix
            doc_title = f"{title} - {name}"
            items.append((f"{doc_title}\n\n{loaded[0]}", {"source_url": url, "page_title": doc_title, "date_scraped": date}, f"PDF {name!r}"))
    if missing:
        logger.warning("%d linked PDFs not downloaded; run: python scripts/api_crawl.py --reclassify --docs", missing)
    return items


def _ingest_legacy(add_chunks) -> None:
    raw_txt = sorted(DATA_DIR.glob("*.txt"))
    pdf_files = sorted(DATA_DIR.glob("*.pdf"))
    txt_files = [p for p in raw_txt if p.name != BOOTSTRAP_KB]
    if txt_files and len(raw_txt) > len(txt_files):
        logger.info("Skipping %s (stale bootstrap); using scraped .txt files only.", BOOTSTRAP_KB)

    logger.info("Found %d txt and %d pdf files", len(txt_files), len(pdf_files))

    if not txt_files and not pdf_files:
        kb_path = ROOT / "public" / "chatbot" / "knowledge-base.json"
        if kb_path.exists():
            payload = json.loads(kb_path.read_text(encoding="utf-8"))
            bootstrap = DATA_DIR / BOOTSTRAP_KB
            merged = []
            for row in payload.get("documents", [])[:120]:
                merged.append(
                    f"Source URL: {row.get('sourceUrl','')}\n"
                    f"Page Title: {row.get('title','')}\n"
                    f"Date Scraped: {payload.get('generatedAt','')}\n\n"
                    f"{row.get('content','')}\n"
                )
            bootstrap.write_text("\n\n".join(merged), encoding="utf-8")
            txt_files = [bootstrap]
            logger.info("No /data txt/pdf found. Bootstrapped from knowledge-base.json")

    for txt_path in txt_files:
        text, meta = _load_txt(txt_path)
        add_chunks(text, meta, f"TXT {txt_path.name}")

    for pdf_path in pdf_files:
        loaded = _load_pdf(pdf_path)
        if loaded is not None:
            add_chunks(loaded[0], loaded[1], f"PDF {pdf_path.name}")


def main() -> None:
    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    records: list[dict[str, Any]] = []
    texts_for_embedding: list[str] = []

    def add_chunks(text: str, meta: dict[str, str], label: str) -> None:
        text = text.encode("utf-8", "ignore").decode("utf-8")  # PDF extraction can emit lone surrogates; the tokenizer rejects them
        token_ids = tokenizer.encode(text, add_special_tokens=False)
        chunks = _token_chunk(token_ids, CHUNK_SIZE, OVERLAP)
        for idx, chunk_ids in enumerate(chunks):
            chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True).strip()
            if not chunk_text:
                continue
            records.append(
                {
                    "id": hashlib.sha256(f"{meta['source_url']}::{idx}::{chunk_text}".encode("utf-8")).hexdigest(),
                    "text": chunk_text,
                    "source_url": meta["source_url"],
                    "page_title": meta["page_title"],
                    "date_scraped": meta["date_scraped"],
                    "chunk_index": idx,
                    "content_hash": hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
                    "has_table": bool(TABLE_LINE_RE.search(chunk_text)),
                    "table_row_count": sum(1 for line in chunk_text.splitlines() if TABLE_LINE_RE.search(line)),
                    "contact_field_count": len(EMAIL_RE.findall(chunk_text)) + len(PHONE_RE.findall(chunk_text)),
                    "normalized_title": TITLE_CLEAN_RE.sub(" ", meta["page_title"]).strip().lower(),
                }
            )
            texts_for_embedding.append(chunk_text)
        logger.info("Chunked %s into %d chunks", label, len(chunks))

    if API_PAGES.exists():
        # The API crawl covers the same site as the old scrape, so mixing them would only add stale duplicates.
        logger.info("Using %s; skipping legacy data/*.txt and data/*.pdf", API_PAGES.relative_to(ROOT))
        for text, meta, label in _load_api_crawl():
            add_chunks(text, meta, label)
    else:
        _ingest_legacy(add_chunks)

    if not texts_for_embedding:
        raise RuntimeError("No chunks found. Run scripts/api_crawl.py, or put .txt/.pdf files in /data.")

    vectors = embedder.encode(
        texts_for_embedding,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).astype(np.float32)

    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    faiss.write_index(index, str(INDEX_PATH))
    META_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Saved index -> %s", INDEX_PATH)
    logger.info("Saved metadata -> %s", META_PATH)
    logger.info("Total chunks indexed: %d", len(records))


if __name__ == "__main__":
    main()
