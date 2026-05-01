from __future__ import annotations

import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
META_PATH = DATA_DIR / "metadata.json"
ENV_PATH = ROOT / "backend" / ".env"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 100
ENABLE_EXTRA_COLUMNS = os.getenv("SUPABASE_RAG_EXTRA_COLUMNS", "false").strip().lower() in {"1", "true", "yes", "on"}


def load_env() -> tuple[str, str]:
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH)
    load_dotenv(ROOT / ".env")
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")
    return url, key


def batched(items: list[dict], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def main() -> None:
    if not META_PATH.exists():
        raise FileNotFoundError(f"metadata.json not found at {META_PATH}. Run scripts/ingest.py first.")

    url, key = load_env()
    model = SentenceTransformer(MODEL_NAME)

    docs = json.loads(META_PATH.read_text(encoding="utf-8"))
    texts = [d["text"] for d in docs]
    vectors = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).tolist()

    # Build payload and deduplicate by content_hash so we never violate the unique constraint.
    payload: list[dict] = []
    seen_hashes: set[str] = set()
    for doc, vector in zip(docs, vectors, strict=False):
        h = doc["content_hash"]
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        row = {
            "id": doc["id"],
            "source_url": doc["source_url"],
            "page_title": doc["page_title"],
            "date_scraped": doc["date_scraped"],
            "chunk_index": int(doc["chunk_index"]),
            "content": doc["text"],
            "content_hash": doc["content_hash"],
            "embedding": vector,
        }
        # Optional feature columns for enhanced ranking; disabled by default for schema compatibility.
        if ENABLE_EXTRA_COLUMNS:
            row["has_table"] = bool(doc.get("has_table", False))
            row["table_row_count"] = int(doc.get("table_row_count", 0))
            row["contact_field_count"] = int(doc.get("contact_field_count", 0))
            row["normalized_title"] = str(doc.get("normalized_title", ""))
        payload.append(row)

    rest_url = f"{url.rstrip('/')}/rest/v1/rag_documents"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    with httpx.Client(timeout=30) as client:
        for i, batch in enumerate(batched(payload, BATCH_SIZE)):
            res = client.post(rest_url, json=batch, headers=headers)
            res.raise_for_status()
            print(f"  Batch {i + 1}: upserted {len(batch)} rows")

    print(f"Synced {len(payload)} chunks to Supabase rag_documents.")


if __name__ == "__main__":
    main()
