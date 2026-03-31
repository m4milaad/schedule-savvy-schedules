from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from exa_py import Exa
from sentence_transformers import CrossEncoder, SentenceTransformer

from backend.config import Settings


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
        self.embedder = SentenceTransformer(settings.embedding_model)
        self.reranker = CrossEncoder(settings.reranker_model)
        self.index: faiss.Index | None = None
        self.metadata: list[dict[str, Any]] = []
        self.exa = Exa(settings.exa_api_key) if settings.exa_api_key else None

    def load_index(self, index_path: Path | None = None, metadata_path: Path | None = None) -> None:
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
        return 0 if self.index is None else int(self.index.ntotal)

    @lru_cache(maxsize=1024)
    def embed_query(self, query: str) -> tuple[float, ...]:
        vec = self.embedder.encode([query], normalize_embeddings=True, convert_to_numpy=True)[0]
        return tuple(float(x) for x in vec.tolist())

    def _distance_to_cosine(self, distance: float) -> float:
        # For normalized vectors with L2 distance: d^2 = 2(1-cos)
        cosine = 1.0 - (distance / 2.0)
        return float(max(0.0, min(1.0, cosine)))

    def _rerank(self, query: str, candidates: list[tuple[int, float]]) -> list[tuple[int, float, float]]:
        if not candidates:
            return []
        pairs = [(query, self.metadata[idx]["text"]) for idx, _ in candidates]
        rerank_scores = self.reranker.predict(pairs).tolist()
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

        top_idx, top_distance, _ = reranked[0]
        confidence = self._distance_to_cosine(top_distance)
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
        # Ensure top confidence is based on FAISS best match
        _ = top_idx
        return chunks, confidence

    def _exa_fallback(self, query: str) -> list[RetrievedChunk]:
        if self.exa is None:
            return []
        result = self.exa.search_and_contents(query=query, num_results=3, text=True, type="auto")
        chunks: list[RetrievedChunk] = []
        for idx, item in enumerate(getattr(result, "results", []), start=1):
            text = (getattr(item, "text", "") or "").strip()
            if not text:
                continue
            chunks.append(
                RetrievedChunk(
                    text=text[:1800],
                    source_url=(getattr(item, "url", "") or "").strip(),
                    page_title=(getattr(item, "title", "") or "Exa fallback").strip(),
                    date_scraped="live",
                    chunk_index=idx,
                    score=0.2,
                )
            )
        return chunks[:3]

    def retrieve(self, query: str) -> RetrievalOutput:
        local_chunks, confidence = self._local_retrieve(query)
        if local_chunks and confidence >= self.settings.confidence_threshold:
            return RetrievalOutput(chunks=local_chunks, confidence=confidence, mode="faiss")

        fallback_chunks = self._exa_fallback(query)
        if fallback_chunks:
            return RetrievalOutput(chunks=fallback_chunks, confidence=confidence, mode="exa")
        return RetrievalOutput(chunks=local_chunks, confidence=confidence, mode="faiss")
