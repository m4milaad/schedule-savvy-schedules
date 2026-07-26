from __future__ import annotations

import json
import logging
import hashlib
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INDEX_PATH = DATA_DIR / "faiss_index.bin"
META_PATH = DATA_DIR / "metadata.json"
MANIFEST_PATH = DATA_DIR / "index_manifest.json"

# BGE small: same 384-dim footprint as MiniLM but significantly better retrieval quality.
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

CHUNK_SIZE = 400          # target tokens per chunk
OVERLAP = 80              # token overlap for windowed splits of long sections
MIN_CHUNK_TOKENS = 40     # drop tiny fragments
HARD_MAX_TOKENS = 512     # never exceed model context for a single chunk
# Paragraphs that appear on many pages (nav menus, footers) are boilerplate.
BOILERPLATE_DOC_FRACTION = 0.20
BOILERPLATE_MIN_DOCS = 8
BOILERPLATE_MAX_CHARS = 240

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
NOISE_PARA_RE = re.compile(
    r"^(home|about us|contact us|sitemap|screen reader|skip to (main )?content|copyright|"
    r"all rights reserved|privacy policy|terms (of use|and conditions))\b",
    re.I,
)


def _extract_url(text: str) -> str:
    match = re.search(r"https?://[^\s)>\"]+", text)
    return match.group(0) if match else ""


# ---------------------------------------------------------------------------
# Structure-aware chunking
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class Paragraph:
    text: str
    is_table: bool
    heading: str


@dataclass(slots=True)
class Chunk:
    text: str            # raw text stored in metadata / shown to the LLM
    embed_text: str      # title/heading-prefixed text used for embedding
    heading: str
    has_table: bool
    table_row_count: int


def _looks_like_heading(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 90:
        return False
    if stripped.endswith((".", ",", ";", ":")):
        return False
    words = stripped.split()
    if len(words) > 12:
        return False
    # Title Case / ALL CAPS short lines are treated as headings.
    upper_ratio = sum(1 for w in words if w[:1].isupper()) / max(1, len(words))
    return upper_ratio >= 0.6


def _split_paragraphs(text: str) -> list[Paragraph]:
    """Split raw text into paragraphs, tracking section headings and table blocks."""
    paragraphs: list[Paragraph] = []
    current_heading = ""
    for raw_block in re.split(r"\n\s*\n", text):
        block = raw_block.strip("\n")
        if not block.strip():
            continue
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        table_lines = sum(1 for ln in lines if TABLE_LINE_RE.search(ln))
        is_table = len(lines) >= 2 and table_lines >= max(2, int(len(lines) * 0.5))
        if not is_table and len(lines) == 1 and _looks_like_heading(lines[0]):
            current_heading = lines[0].strip()
            continue
        paragraphs.append(
            Paragraph(text=block.strip(), is_table=is_table, heading=current_heading)
        )
    return paragraphs


def _is_noise_paragraph(para: Paragraph) -> bool:
    return bool(NOISE_PARA_RE.match(para.text.strip()))


def _window_tokens(tokenizer, text: str) -> list[str]:
    """Fallback token-window split for a single oversized section."""
    token_ids = tokenizer.encode(text, add_special_tokens=False)
    pieces: list[str] = []
    step = max(1, CHUNK_SIZE - OVERLAP)
    for start in range(0, len(token_ids), step):
        piece_ids = token_ids[start : start + CHUNK_SIZE]
        if len(piece_ids) < MIN_CHUNK_TOKENS:
            continue
        pieces.append(tokenizer.decode(piece_ids, skip_special_tokens=True).strip())
        if start + CHUNK_SIZE >= len(token_ids):
            break
    return pieces


def _table_row_count(text: str) -> int:
    return sum(1 for line in text.splitlines() if TABLE_LINE_RE.search(line))


def structure_chunk(tokenizer, text: str, page_title: str) -> list[Chunk]:
    """Structure-aware chunking:

    - paragraphs are grouped by section heading,
    - table blocks are kept intact (never split mid-row unless they exceed the
      model's hard token limit),
    - long prose sections fall back to a token window with overlap,
    - every chunk embeds with a "title - heading" prefix for better recall.
    """
    paragraphs = [p for p in _split_paragraphs(text) if not _is_noise_paragraph(p)]
    chunks: list[Chunk] = []

    def flush(buffer: list[Paragraph]) -> None:
        if not buffer:
            return
        body = "\n\n".join(p.text for p in buffer)
        heading = buffer[0].heading
        n_tokens = len(tokenizer.encode(body, add_special_tokens=False))
        if n_tokens < MIN_CHUNK_TOKENS:
            return
        has_table = any(p.is_table for p in buffer)
        pieces = [body] if n_tokens <= HARD_MAX_TOKENS else _window_tokens(tokenizer, body)
        for piece in pieces:
            prefix_parts = [part for part in (page_title.strip(), heading) if part]
            prefix = " - ".join(prefix_parts)
            embed_text = f"{prefix}\n{piece}" if prefix else piece
            chunks.append(
                Chunk(
                    text=piece,
                    embed_text=embed_text,
                    heading=heading,
                    has_table=has_table and bool(TABLE_LINE_RE.search(piece)),
                    table_row_count=_table_row_count(piece),
                )
            )

    buffer: list[Paragraph] = []
    buffer_tokens = 0
    for para in paragraphs:
        para_tokens = len(tokenizer.encode(para.text, add_special_tokens=False))
        # Tables are their own chunk so rows never get split away from headers.
        if para.is_table:
            flush(buffer)
            buffer, buffer_tokens = [], 0
            flush([para])
            continue
        new_section = buffer and para.heading != buffer[0].heading
        if new_section or buffer_tokens + para_tokens > CHUNK_SIZE:
            flush(buffer)
            buffer, buffer_tokens = [], 0
        buffer.append(para)
        buffer_tokens += para_tokens
    flush(buffer)
    return chunks


def collect_boilerplate(doc_texts: list[str]) -> set[str]:
    """Find short paragraphs repeated across many documents (nav/footer noise)."""
    counts: Counter[str] = Counter()
    for text in doc_texts:
        seen: set[str] = set()
        for para in _split_paragraphs(text):
            body = para.text.strip()
            if len(body) <= BOILERPLATE_MAX_CHARS:
                seen.add(body)
        counts.update(seen)
    threshold = max(BOILERPLATE_MIN_DOCS, int(len(doc_texts) * BOILERPLATE_DOC_FRACTION))
    return {para for para, count in counts.items() if count >= threshold}


def strip_boilerplate(text: str, boilerplate: set[str]) -> str:
    if not boilerplate:
        return text
    kept: list[str] = []
    for raw_block in re.split(r"\n\s*\n", text):
        if raw_block.strip() in boilerplate:
            continue
        kept.append(raw_block)
    return "\n\n".join(kept)


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------


def _load_txt(path: Path) -> tuple[str, dict[str, str]]:
    """Load a TXT file produced by scrape_cuk.py, preserving its header metadata."""
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
    """Second-pass text extract; often succeeds when pypdf returns nothing."""
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
    """Read *internal* PDF text layers (not OCR)."""
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

    source_url = f"file://{path.name}"
    page_title = path.stem.replace("_", " ").strip()
    date_scraped = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    return joined, {
        "source_url": source_url,
        "page_title": page_title,
        "date_scraped": date_scraped,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def _build_records(
    tokenizer,
    text: str,
    common_meta: dict[str, str],
    records: list[dict[str, Any]],
    texts_for_embedding: list[str],
) -> int:
    chunks = structure_chunk(tokenizer, text, common_meta["page_title"])
    for idx, chunk in enumerate(chunks):
        chunk_text = chunk.text.strip()
        if not chunk_text:
            continue
        records.append(
            {
                "id": hashlib.sha256(
                    f"{common_meta['source_url']}::{idx}::{chunk_text}".encode("utf-8")
                ).hexdigest(),
                "text": chunk_text,
                "source_url": common_meta["source_url"],
                "page_title": common_meta["page_title"],
                "section_heading": chunk.heading,
                "date_scraped": common_meta["date_scraped"],
                "chunk_index": idx,
                "content_hash": hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
                "has_table": chunk.has_table,
                "table_row_count": chunk.table_row_count,
                "contact_field_count": len(EMAIL_RE.findall(chunk_text)) + len(PHONE_RE.findall(chunk_text)),
                "normalized_title": TITLE_CLEAN_RE.sub(" ", common_meta["page_title"]).strip().lower(),
            }
        )
        texts_for_embedding.append(chunk.embed_text)
    return len(chunks)


def main() -> None:
    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL)
    embedder = SentenceTransformer(EMBEDDING_MODEL)

    records: list[dict[str, Any]] = []
    texts_for_embedding: list[str] = []

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

    # Pass 1: load everything so cross-page boilerplate can be detected.
    loaded_txt: list[tuple[str, dict[str, str]]] = []
    for txt_path in txt_files:
        loaded_txt.append(_load_txt(txt_path))
    boilerplate = collect_boilerplate([text for text, _ in loaded_txt])
    if boilerplate:
        logger.info("Detected %d boilerplate paragraphs (nav/footer) to strip", len(boilerplate))

    # Pass 2: chunk and collect records.
    for (text, common_meta), txt_path in zip(loaded_txt, txt_files, strict=False):
        cleaned = strip_boilerplate(text, boilerplate)
        n = _build_records(tokenizer, cleaned, common_meta, records, texts_for_embedding)
        logger.info("Chunked TXT %s into %d chunks", txt_path.name, n)

    for pdf_path in pdf_files:
        loaded = _load_pdf(pdf_path)
        if loaded is None:
            continue
        text, common_meta = loaded
        n = _build_records(tokenizer, text, common_meta, records, texts_for_embedding)
        logger.info("Chunked PDF %s into %d chunks", pdf_path.name, n)

    if not texts_for_embedding:
        raise RuntimeError("No chunks found. Ensure /data has .txt or .pdf files.")

    vectors = embedder.encode(
        texts_for_embedding,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).astype(np.float32)

    # Vectors are normalized, so inner product == cosine similarity (cheaper than L2).
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    faiss.write_index(index, str(INDEX_PATH))
    META_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "embedding_model": EMBEDDING_MODEL,
                "metric": "inner_product",
                "dimensions": int(vectors.shape[1]),
                "chunking": "structure_aware_v2",
                "chunk_size": CHUNK_SIZE,
                "overlap": OVERLAP,
                "total_chunks": len(records),
                "built_at": datetime.now(tz=timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    logger.info("Saved index -> %s", INDEX_PATH)
    logger.info("Saved metadata -> %s", META_PATH)
    logger.info("Saved manifest -> %s", MANIFEST_PATH)
    logger.info("Total chunks indexed: %d", len(records))


if __name__ == "__main__":
    main()
