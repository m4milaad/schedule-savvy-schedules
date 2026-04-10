from __future__ import annotations

import asyncio
import logging
import re
from time import perf_counter

from app.cache import TTLCache
from app.config import Settings
from app.llm import AnswerGenerator
from app.models import ChatResponse, SearchResponse, SourceDocument
from app.retriever import Retriever
from app.query_expansion import expand_query, extract_department_name

logger = logging.getLogger(__name__)

_GREETING_PATTERNS = re.compile(
    r"^(h(i|ello|ey|ola|owdy)|good\s*(morning|afternoon|evening|day)|"
    r"what'?s\s*up|sup|yo|greetings|salaam|assalam[u ]?alaikum|"
    r"how\s*are\s*you|how'?s\s*it\s*going|how\s*do\s*you\s*do|"
    r"thanks?|thank\s*you|bye|goodbye|see\s*ya|"
    r"nice\s*to\s*meet\s*you|pleased\s*to\s*meet\s*you)[\s!?.,:;]*$",
    re.IGNORECASE,
)

_GREETING_RESPONSES: dict[str, str] = {
    "greeting": (
        "Hello! I'm NeMoX, the CUK academic assistant. "
        "I can help you with information about Central University of Kashmir — "
        "admissions, exams, schedules, departments, faculty, notices, and more. "
        "What would you like to know?"
    ),
    "how_are_you": (
        "I'm NeMoX, your CUK academic assistant, and I'm doing great — thank you for asking! "
        "I'm here to help you with anything related to Central University of Kashmir. "
        "Feel free to ask about admissions, courses, departments, faculty, or schedules."
    ),
    "thanks": (
        "You're welcome! If you have any more questions about CUK, NeMoX is here to help anytime."
    ),
    "bye": (
        "Goodbye! Feel free to come back whenever you need help with CUK-related queries. NeMoX will be here. Take care!"
    ),
}


def _match_casual(query: str) -> str | None:
    text = query.strip()
    if not _GREETING_PATTERNS.match(text):
        return None
    lower = text.lower().rstrip("!?., ")
    if re.match(r"how\s*are\s*you|how'?s\s*it\s*going|how\s*do\s*you\s*do", lower):
        return _GREETING_RESPONSES["how_are_you"]
    if re.match(r"thanks?|thank\s*you", lower):
        return _GREETING_RESPONSES["thanks"]
    if re.match(r"bye|goodbye|see\s*ya", lower):
        return _GREETING_RESPONSES["bye"]
    return _GREETING_RESPONSES["greeting"]


def _cosine_from_distance(distance: float) -> float:
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

    def _build_context(
        self,
        items: list,
        sources: list[SourceDocument],
        max_chars: int,
    ) -> list[str]:
        blocks: list[str] = []
        total = 0
        for item, doc in zip(items, sources):
            content = item.document.content
            block = f"[{doc.page_title}] {content}"
            if total + len(block) > max_chars:
                remaining = max_chars - total
                if remaining > 200:
                    blocks.append(block[:remaining])
                break
            blocks.append(block)
            total += len(block)
        return blocks

    def _retrieve_sync(self, query: str, top_k: int):
        return self.retriever.retrieve(query=query, top_k=top_k)

    async def chat(self, query: str, top_k: int | None = None) -> ChatResponse:
        casual = _match_casual(query)
        if casual:
            return ChatResponse(answer=casual, sources=[], mode="greeting")

        cache_key = f"{query.strip().lower()}::{top_k or self.settings.retrieval_top_k}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        started = perf_counter()
        effective_top_k = top_k or self.settings.retrieval_top_k

        # Expand query for better retrieval
        query_variations = expand_query(query)
        logger.info("query_expansion: original=%r variations=%r", query, query_variations)
        
        # Retrieve with all query variations
        all_items = []
        for q_var in query_variations:
            items = await asyncio.to_thread(self._retrieve_sync, q_var, effective_top_k)
            all_items.extend(items)
        
        # Deduplicate by URL and sort by score
        seen_urls = set()
        unique_items = []
        for item in sorted(all_items, key=lambda x: abs(x.score)):
            if item.document.url not in seen_urls:
                seen_urls.add(item.document.url)
                unique_items.append(item)
        
        # Take top items after deduplication
        items = unique_items[:effective_top_k * 2]  # Get more items for better context

        scored_items = []
        for item in items[:effective_top_k]:
            sim = _cosine_from_distance(abs(item.score))
            if sim >= self.settings.retrieval_score_threshold:
                scored_items.append((item, round(sim, 4)))

        if not scored_items:
            logger.info("no chunks above threshold %.2f for query=%r", self.settings.retrieval_score_threshold, query)
            scored_items = [(item, round(_cosine_from_distance(abs(item.score)), 4)) for item in items[:3]]

        sources = [
            SourceDocument(source_url=item.document.url, page_title=item.document.title, score=score)
            for item, score in scored_items
        ]
        filtered_items = [item for item, _ in scored_items]

        context_blocks = self._build_context(filtered_items, sources, self.settings.max_context_chars)

        retrieval_ms = int((perf_counter() - started) * 1000)
        
        # Extract department for better logging
        dept_name = extract_department_name(query)
        
        logger.info(
            "chat retrieval: query=%r dept=%r variations=%d chunks=%d context_chars=%d top_score=%.3f elapsed_ms=%d",
            query, dept_name, len(query_variations), len(context_blocks), 
            sum(len(b) for b in context_blocks),
            scored_items[0][1] if scored_items else 0,
            retrieval_ms,
        )

        answer = await self.generator.answer(query, context_blocks=context_blocks)

        mode = "faiss"
        response = ChatResponse(answer=answer, sources=sources, mode=mode)
        self._cache.set(cache_key, response)
        return response

    async def search(self, query: str, top_k: int | None = None) -> SearchResponse:
        effective_top_k = top_k or self.settings.retrieval_top_k
        items = await asyncio.to_thread(self._retrieve_sync, query, effective_top_k)
        documents = [
            SourceDocument(
                source_url=item.document.url,
                page_title=item.document.title,
                score=round(_cosine_from_distance(abs(item.score)), 4),
            )
            for item in items[:effective_top_k]
        ]
        return SearchResponse(query=query, documents=documents)
