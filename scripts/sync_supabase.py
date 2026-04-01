from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
META_PATH = DATA_DIR / "metadata.json"
ENV_PATH = ROOT / "backend" / ".env"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 100


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
        yield items[i:i + size]


def main() -> None:
    if not META_PATH.exists():
        raise FileNotFoundError(f"metadata.json not found at {META_PATH}. Run scripts/ingest.py first.")

    url, key = load_env()
    client: Client = create_client(url, key)
    model = SentenceTransformer(MODEL_NAME)

    docs = json.loads(META_PATH.read_text(encoding="utf-8"))
    texts = [d["text"] for d in docs]
    vectors = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).tolist()

    payload = []
    for doc, vector in zip(docs, vectors, strict=False):
        payload.append(
            {
                "id": doc["id"],
                "source_url": doc["source_url"],
                "page_title": doc["page_title"],
                "date_scraped": doc["date_scraped"],
                "chunk_index": int(doc["chunk_index"]),
                "content": doc["text"],
                "content_hash": doc["content_hash"],
                "embedding": vector,
            }
        )

    for batch in batched(payload, BATCH_SIZE):
        client.table("rag_documents").upsert(batch, on_conflict="content_hash").execute()

    print(f"Synced {len(payload)} chunks to Supabase rag_documents.")


if __name__ == "__main__":
    main()
