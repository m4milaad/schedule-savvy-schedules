from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import faiss
import numpy as np


@dataclass
class IndexedDocument:
    id: str
    title: str
    url: str
    source: str
    category: str
    content: str


class VectorStore:
    def __init__(self, index: faiss.Index, documents: list[IndexedDocument]):
        self.index = index
        self.documents = documents

    @classmethod
    def load(cls, index_path: Path, metadata_path: Path) -> "VectorStore":
        if not index_path.exists():
            raise FileNotFoundError(f"FAISS index not found: {index_path}")
        if not metadata_path.exists():
            raise FileNotFoundError(f"FAISS metadata file not found: {metadata_path}")

        index = faiss.read_index(str(index_path))
        documents: list[IndexedDocument] = []
        with metadata_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                row = json.loads(line)
                documents.append(
                    IndexedDocument(
                        id=row["id"],
                        title=row["title"],
                        url=row["url"],
                        source=row["source"],
                        category=row["category"],
                        content=row["content"],
                    )
                )
        return cls(index=index, documents=documents)

    def search(self, query_vector: list[float], top_k: int) -> list[tuple[IndexedDocument, float]]:
        vec = np.array([query_vector], dtype=np.float32)
        scores, indices = self.index.search(vec, top_k)
        matches: list[tuple[IndexedDocument, float]] = []
        for idx, score in zip(indices[0], scores[0], strict=False):
            if idx < 0 or idx >= len(self.documents):
                continue
            matches.append((self.documents[idx], float(score)))
        return matches
