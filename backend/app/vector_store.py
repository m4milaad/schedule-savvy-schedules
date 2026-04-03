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
    date_scraped: str = ""
    chunk_index: int = 0


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
        with metadata_path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)

        # Support both JSONL (list of dicts line-by-line) and full JSON array
        rows = raw if isinstance(raw, list) else [json.loads(line) for line in raw if line.strip()]

        documents: list[IndexedDocument] = []
        for row in rows:
            text = row.get("text") or row.get("content", "")
            title = row.get("page_title") or row.get("title", "")
            url = row.get("source_url") or row.get("url", "")
            documents.append(
                IndexedDocument(
                    id=row.get("id", ""),
                    title=title,
                    url=url,
                    source=row.get("source", "self"),
                    category=row.get("category", "web"),
                    content=text,
                    date_scraped=row.get("date_scraped", ""),
                    chunk_index=int(row.get("chunk_index", 0)),
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
