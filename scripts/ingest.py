from __future__ import annotations

import json
import logging
import hashlib
import re
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

CHUNK_SIZE = 400
OVERLAP = 80

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("ingest")


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
    raw = path.read_text(encoding="utf-8", errors="ignore")
    source_url = _extract_url(raw) or f"file://{path.name}"
    page_title = path.stem.replace("_", " ").strip()
    date_scraped = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    return raw, {
        "source_url": source_url,
        "page_title": page_title,
        "date_scraped": date_scraped,
    }


def _load_pdf(path: Path) -> tuple[str, dict[str, str]] | None:
    try:
        reader = PdfReader(str(path))
        pages: list[str] = []
        for page in reader.pages:
            text = (page.extract_text() or "").strip()
            if text:
                pages.append(text)
        joined = "\n\n".join(pages)
        source_url = _extract_url(joined) or f"file://{path.name}"
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


def main() -> None:
    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    records: list[dict[str, Any]] = []
    texts_for_embedding: list[str] = []

    txt_files = sorted(DATA_DIR.glob("*.txt"))
    pdf_files = sorted(DATA_DIR.glob("*.pdf"))

    logger.info("Found %d txt and %d pdf files", len(txt_files), len(pdf_files))

    if not txt_files and not pdf_files:
        kb_path = ROOT / "public" / "chatbot" / "knowledge-base.json"
        if kb_path.exists():
            payload = json.loads(kb_path.read_text(encoding="utf-8"))
            bootstrap = DATA_DIR / "bootstrap_kb.txt"
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
        text, common_meta = _load_txt(txt_path)
        token_ids = tokenizer.encode(text, add_special_tokens=False)
        chunks = _token_chunk(token_ids, CHUNK_SIZE, OVERLAP)
        for idx, chunk_ids in enumerate(chunks):
            chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True).strip()
            if not chunk_text:
                continue
            records.append(
                {
                    "id": hashlib.sha256(f"{common_meta['source_url']}::{idx}::{chunk_text}".encode("utf-8")).hexdigest(),
                    "text": chunk_text,
                    "source_url": common_meta["source_url"],
                    "page_title": common_meta["page_title"],
                    "date_scraped": common_meta["date_scraped"],
                    "chunk_index": idx,
                    "content_hash": hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
                }
            )
            texts_for_embedding.append(chunk_text)
        logger.info("Chunked TXT %s into %d chunks", txt_path.name, len(chunks))

    for pdf_path in pdf_files:
        loaded = _load_pdf(pdf_path)
        if loaded is None:
            continue
        text, common_meta = loaded
        token_ids = tokenizer.encode(text, add_special_tokens=False)
        chunks = _token_chunk(token_ids, CHUNK_SIZE, OVERLAP)
        for idx, chunk_ids in enumerate(chunks):
            chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True).strip()
            if not chunk_text:
                continue
            records.append(
                {
                    "id": hashlib.sha256(f"{common_meta['source_url']}::{idx}::{chunk_text}".encode("utf-8")).hexdigest(),
                    "text": chunk_text,
                    "source_url": common_meta["source_url"],
                    "page_title": common_meta["page_title"],
                    "date_scraped": common_meta["date_scraped"],
                    "chunk_index": idx,
                    "content_hash": hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
                }
            )
            texts_for_embedding.append(chunk_text)
        logger.info("Chunked PDF %s into %d chunks", pdf_path.name, len(chunks))

    if not texts_for_embedding:
        raise RuntimeError("No chunks found. Ensure /data has .txt or .pdf files.")

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
