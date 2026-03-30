from __future__ import annotations

import json
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


ROOT = Path(__file__).resolve().parents[1]
DOCS_JSONL = ROOT / "data" / "processed" / "documents.jsonl"
INDEX_PATH = ROOT / "data" / "processed" / "faiss.index"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_docs(path: Path) -> list[dict]:
    docs: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                docs.append(json.loads(line))
    return docs


def main() -> None:
    if not DOCS_JSONL.exists():
        raise FileNotFoundError(
            f"Missing documents file: {DOCS_JSONL}. Run scripts/prepare_documents.py first."
        )

    docs = load_docs(DOCS_JSONL)
    texts = [doc["content"] for doc in docs]
    model = SentenceTransformer(MODEL_NAME)
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=True,
    ).astype(np.float32)

    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(INDEX_PATH))
    print(f"Indexed {len(docs)} documents -> {INDEX_PATH}")


if __name__ == "__main__":
    main()
