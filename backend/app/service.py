from __future__ import annotations

from time import perf_counter

from app.cache import TTLCache
from app.config import Settings
from app.llm import AnswerGenerator
from app.models import ChatResponse, RetrievalResult, SearchResponse, SourceDocument
from app.retriever import Retriever


def _cosine_from_distance(distance: float) -> float:
    # For L2-normalized vectors: cos = 1 - d^2 / 2
    similarity = 1.0 - (distance / 2.0)
    return float(max(0.0, min(1.0, similarity)))


class RagService:
    def __init__(
        self,
        settings: Settings,
        retriever: Retriever,
        generator: AnswerGenerator,
    ):
        self.settings = settings
        self.retriever = retriever
        self.generator = generator
        self._cache = TTLCache[ChatResponse](
            ttl_seconds=settings.cache_ttl_seconds,
            max_items=settings.cache_max_items,
        )

    def chat(self, query: str, top_k: int | None = None) -> ChatResponse:
        cache_key = f"{query.strip().lower()}::{top_k or self.settings.retrieval_top_k}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        started = perf_counter()
        effective_top_k = top_k or self.settings.retrieval_top_k
        items = self.retriever.retrieve(query=query, top_k=effective_top_k)

        sources = [
            SourceDocument(
                source_url=item.document.url,
                page_title=item.document.title,
                score=round(_cosine_from_distance(abs(item.score)), 4),
            )
            for item in items[:effective_top_k]
        ]

        context_blocks = [
            f"[{doc.page_title}] {item.document.content[:500]}"
            for item, doc in zip(items[:effective_top_k], sources)
        ]
        answer = self.generator.answer(query, context_blocks=context_blocks)

        mode = "faiss"
        response = ChatResponse(answer=answer, sources=sources, mode=mode)
        self._cache.set(cache_key, response)
        return response

    def search(self, query: str, top_k: int | None = None) -> SearchResponse:
        effective_top_k = top_k or self.settings.retrieval_top_k
        items = self.retriever.retrieve(query=query, top_k=effective_top_k)
        documents = [
            SourceDocument(
                source_url=item.document.url,
                page_title=item.document.title,
                score=round(_cosine_from_distance(abs(item.score)), 4),
            )
            for item in items[:effective_top_k]
        ]
        return SearchResponse(query=query, documents=documents)
