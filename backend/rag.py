from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

import httpx
import numpy as np

from backend.config import Settings

if TYPE_CHECKING:
    import faiss as _faiss
    from sentence_transformers import CrossEncoder, SentenceTransformer


@dataclass(slots=True)
class RetrievedChunk:
    text: str
    source_url: str
    page_title: str
    date_scraped: str
    chunk_index: int
    score: float


@dataclass(slots=True)
class RetrievalOutput:
    chunks: list[RetrievedChunk]
    confidence: float
    mode: str


class RagPipeline:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.embedder: SentenceTransformer | None = None
        self.reranker: CrossEncoder | None = None
        self.index: _faiss.Index | None = None
        self.metadata: list[dict[str, Any]] = []
        self.supabase_enabled = bool(settings.supabase_url and settings.supabase_service_role_key)

    def _ensure_embedder(self) -> SentenceTransformer:
        if self.embedder is None:
            from sentence_transformers import SentenceTransformer

            self.embedder = SentenceTransformer(self.settings.embedding_model)
        return self.embedder

    def _ensure_reranker(self) -> CrossEncoder:
        if self.reranker is None:
            from sentence_transformers import CrossEncoder

            self.reranker = CrossEncoder(self.settings.reranker_model)
        return self.reranker

    def load_index(self, index_path: Path | None = None, metadata_path: Path | None = None) -> None:
        if self.settings.rag_store == "supabase":
            return
        import faiss

        faiss_path = index_path or self.settings.faiss_index_path
        meta_path = metadata_path or self.settings.metadata_path
        if not faiss_path.exists():
            raise FileNotFoundError(f"FAISS index not found: {faiss_path}")
        if not meta_path.exists():
            raise FileNotFoundError(f"Metadata not found: {meta_path}")
        self.index = faiss.read_index(str(faiss_path))
        self.metadata = json.loads(meta_path.read_text(encoding="utf-8"))

    @property
    def index_size(self) -> int:
        if self.settings.rag_store == "supabase":
            return 0
        return 0 if self.index is None else int(self.index.ntotal)

    @lru_cache(maxsize=1024)
    def embed_query(self, query: str) -> tuple[float, ...]:
        vec = self._ensure_embedder().encode([query], normalize_embeddings=True, convert_to_numpy=True)[0]
        return tuple(float(x) for x in vec.tolist())

    def _distance_to_cosine(self, distance: float) -> float:
        cosine = 1.0 - (distance / 2.0)
        return float(max(0.0, min(1.0, cosine)))

    def _rerank(
        self,
        query: str,
        candidates: list[tuple[int, float]],
        metadata: list[dict[str, Any]] | None = None,
    ) -> list[tuple[int, float, float]]:
        if not candidates:
            return []
        meta = metadata if metadata is not None else self.metadata
        pairs = [(query, meta[idx]["text"]) for idx, _ in candidates]
        try:
            rerank_scores = self._ensure_reranker().predict(pairs).tolist()
        except Exception:
            rerank_scores = [0.0 for _ in pairs]
        merged = []
        for (idx, distance), rerank_score in zip(candidates, rerank_scores, strict=False):
            merged.append((idx, float(distance), float(rerank_score)))
        merged.sort(key=lambda row: row[2], reverse=True)
        return merged[:3]

    def _local_retrieve(self, query: str) -> tuple[list[RetrievedChunk], float]:
        if self.index is None:
            raise RuntimeError("Index not loaded.")
        query_vec = np.array([self.embed_query(query)], dtype=np.float32)
        distances, indices = self.index.search(query_vec, 15)
        candidates: list[tuple[int, float]] = []
        for idx, distance in zip(indices[0], distances[0], strict=False):
            if idx < 0:
                continue
            candidates.append((int(idx), float(distance)))

        reranked = self._rerank(query=query, candidates=candidates)
        if not reranked:
            return [], 0.0
        confidence = self._distance_to_cosine(reranked[0][1])
        chunks: list[RetrievedChunk] = []
        for idx, distance, rerank_score in reranked:
            meta = self.metadata[idx]
            chunks.append(
                RetrievedChunk(
                    text=meta["text"],
                    source_url=meta["source_url"],
                    page_title=meta["page_title"],
                    date_scraped=meta["date_scraped"],
                    chunk_index=int(meta["chunk_index"]),
                    score=float((self._distance_to_cosine(distance) * 0.5) + (max(-5.0, min(5.0, rerank_score)) / 10.0)),
                )
            )
        return chunks, confidence

    def _supabase_retrieve(self, query: str) -> tuple[list[RetrievedChunk], float]:
        if not self.supabase_enabled:
            return [], 0.0
        query_vec = list(self.embed_query(query))
        rpc_url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/rpc/match_rag_documents"
        headers = {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }
        payload = {"query_embedding": query_vec, "match_count": 15}
        try:
            with httpx.Client(timeout=20) as client:
                res = client.post(rpc_url, json=payload, headers=headers)
                res.raise_for_status()
            rows = res.json() or []
        except Exception:
            return [], 0.0
        if not rows:
            return [], 0.0

        candidates: list[tuple[int, float]] = []
        temp_meta: list[dict[str, Any]] = []
        for idx, row in enumerate(rows):
            temp_meta.append(
                {
                    "text": row["content"],
                    "source_url": row["source_url"],
                    "page_title": row["page_title"],
                    "date_scraped": str(row["date_scraped"]),
                    "chunk_index": int(row["chunk_index"]),
                }
            )
            similarity = float(row.get("similarity", 0.0))
            distance = 2.0 * (1.0 - max(0.0, min(1.0, similarity)))
            candidates.append((idx, distance))

        reranked = self._rerank(query=query, candidates=candidates, metadata=temp_meta)

        if not reranked:
            return [], 0.0
        confidence = self._distance_to_cosine(reranked[0][1])
        chunks: list[RetrievedChunk] = []
        for idx, distance, rerank_score in reranked:
            meta = temp_meta[idx]
            chunks.append(
                RetrievedChunk(
                    text=meta["text"],
                    source_url=meta["source_url"],
                    page_title=meta["page_title"],
                    date_scraped=meta["date_scraped"],
                    chunk_index=meta["chunk_index"],
                    score=float((self._distance_to_cosine(distance) * 0.5) + (max(-5.0, min(5.0, rerank_score)) / 10.0)),
                )
            )
        return chunks, confidence

    def retrieve(self, query: str) -> RetrievalOutput:
        if self.settings.rag_store == "supabase":
            local_chunks, confidence = self._supabase_retrieve(query)
            local_mode = "supabase"
        else:
            local_chunks, confidence = self._local_retrieve(query)
            local_mode = "faiss"

        # Scraper-first policy: no Exa fallback; stay grounded in owned crawled data.
        return RetrievalOutput(chunks=local_chunks, confidence=confidence, mode=local_mode)
