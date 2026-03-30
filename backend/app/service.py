from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

from app.cache import TTLCache
from app.config import Settings
from app.exa_client import ExaFallbackClient
from app.llm import AnswerGenerator
from app.models import ChatResponse, SearchResponse, SourceDocument
from app.retriever import Retriever


@dataclass
class RetrievalResult:
    docs: list[SourceDocument]
    used_fallback: bool


def snippet(text: str, max_chars: int = 340) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_chars:
        return cleaned
    return f"{cleaned[:max_chars].rstrip()}..."


class RagService:
    def __init__(
        self,
        settings: Settings,
        retriever: Retriever,
        exa_client: ExaFallbackClient,
        generator: AnswerGenerator,
    ):
        self.settings = settings
        self.retriever = retriever
        self.exa_client = exa_client
        self.generator = generator
        self.cache = TTLCache[ChatResponse](
            ttl_seconds=settings.cache_ttl_seconds,
            max_items=settings.cache_max_items,
        )

    def _retrieve(self, query: str, top_k: int) -> RetrievalResult:
        local_docs = self.retriever.retrieve(query=query, top_k=top_k)
        parsed_docs: list[SourceDocument] = [
            SourceDocument(
                id=item.document.id,
                title=item.document.title,
                url=item.document.url,
                source=item.document.source,
                category=item.document.category,
                snippet=snippet(item.document.content),
                score=round(item.score, 4),
            )
            for item in local_docs
        ]

        if parsed_docs and parsed_docs[0].score >= self.settings.retrieval_score_threshold:
            return RetrievalResult(docs=parsed_docs, used_fallback=False)

        if not self.exa_client.enabled:
            return RetrievalResult(docs=parsed_docs, used_fallback=False)

        fallback_items = self.exa_client.search(
            query=query,
            num_results=self.settings.exa_fallback_results,
            max_chars=1000,
        )
        fallback_docs = [
            SourceDocument(
                id=f"exa_{idx+1}",
                title=item.title,
                url=item.url,
                source="Exa Fallback",
                category="web",
                snippet=snippet(item.text),
                score=0.0,
            )
            for idx, item in enumerate(fallback_items)
        ]
        return RetrievalResult(docs=fallback_docs or parsed_docs, used_fallback=bool(fallback_docs))

    def search(self, query: str, top_k: int | None = None) -> SearchResponse:
        effective_top_k = top_k or self.settings.retrieval_top_k
        result = self._retrieve(query, top_k=effective_top_k)
        return SearchResponse(query=query, documents=result.docs)

    def chat(self, query: str, top_k: int | None = None) -> ChatResponse:
        cache_key = f"{query.strip().lower()}::{top_k or self.settings.retrieval_top_k}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        started = perf_counter()
        effective_top_k = top_k or self.settings.retrieval_top_k
        retrieved = self._retrieve(query, top_k=effective_top_k)

        context_blocks = [
            f"[{doc.title}] {doc.snippet}"
            for doc in retrieved.docs[:effective_top_k]
        ]
        answer = self.generator.answer(query, context_blocks=context_blocks)
        latency_ms = int((perf_counter() - started) * 1000)

        response = ChatResponse(
            answer=answer,
            source="exa" if retrieved.used_fallback else "faiss",
            used_fallback=retrieved.used_fallback,
            latency_ms=latency_ms,
            documents=retrieved.docs,
        )
        self.cache.set(cache_key, response)
        return response
