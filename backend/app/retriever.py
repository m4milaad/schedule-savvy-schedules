from __future__ import annotations

from dataclasses import dataclass

from app.embeddings import EmbeddingService
from app.vector_store import IndexedDocument, VectorStore


@dataclass
class RetrievedItem:
    document: IndexedDocument
    score: float


class Retriever:
    def __init__(self, embedding_service: EmbeddingService, vector_store: VectorStore):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    def retrieve(self, query: str, top_k: int) -> list[RetrievedItem]:
        [vector] = self.embedding_service.encode([query])
        matches = self.vector_store.search(vector, top_k=top_k)
        return [RetrievedItem(document=doc, score=score) for doc, score in matches]
