from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from backend.rag import RetrievedChunk


SYSTEM_PROMPT = (
    "You are NeMoX, the assistant for Central University of Kashmir (CUK). "
    "CUK means Central University of Kashmir.\n\n"
    "You are given retrieved text chunks from CUK's indexed site and documents (the Context). "
    "Your job is to read that Context and answer the user's question in plain, natural sentences.\n\n"
    "Rules:\n"
    "1. When the Context mentions facts relevant to the question—dates, deadlines, CUET/CUCET, "
    "fees, programs, processes, names, emails, phone numbers, departments—say them clearly. "
    "Do not replace a concrete answer with 'visit cukashmir.ac.in' or 'contact admissions' "
    "if the Context already contains the information.\n"
    "2. Synthesize across the Context blocks; you may paraphrase, but stay faithful to what is written.\n"
    "3. If the Context is empty, or it does not discuss the topic asked, say briefly that the indexed "
    "materials do not contain that information, then you may suggest cukashmir.ac.in or the right office.\n"
    "4. Never invent contacts, dates, or policies that are not in the Context."
)


@dataclass(slots=True)
class PromptPayload:
    """Structured turns for chat-templated models (TinyLlama-Chat, Ollama chat, etc.)."""

    messages: list[dict[str, str]]
    source_urls: list[str]


class PromptBuilder:
    def __init__(self, token_limit: int = 4500):
        self.token_limit = token_limit
        self.tokenizer = None

    def _get_tokenizer(self):
        if self.tokenizer is None:
            from transformers import AutoTokenizer
            self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        return self.tokenizer

    def _count_tokens(self, text: str) -> int:
        try:
            return len(self._get_tokenizer().encode(text, add_special_tokens=False))
        except Exception:
            # Keep service available if tokenizer download/init fails at runtime.
            return max(1, len(text.split()))

    def build(
        self,
        query: str,
        chunks: Iterable[RetrievedChunk],
        history: list[dict[str, str]] | None = None,
    ) -> PromptPayload:
        selected_blocks: list[str] = []
        source_urls: list[str] = []
        history = history or []

        messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        for turn in history[-8:]:
            role = turn.get("role")
            content = (turn.get("content") or "").strip()
            if role not in ("user", "assistant") or not content:
                continue
            messages.append({"role": role, "content": content})

        user_header = f"Question:\n{query.strip()}\n\nContext:\n"
        used_tokens = self._count_tokens(user_header)

        for chunk in chunks:
            block = (
                f"- [Source: {chunk.source_url}]\n"
                f"Title: {chunk.page_title}\n"
                f"Content: {chunk.text.strip()}\n"
            )
            block_tokens = self._count_tokens(block)
            if used_tokens + block_tokens > self.token_limit:
                continue
            selected_blocks.append(block)
            source_urls.append(chunk.source_url)
            used_tokens += block_tokens

        context = "\n".join(selected_blocks)
        user_message = (
            f"{user_header}{context}\n\n"
            "Reply to the user now. Every factual claim must come from the Context blocks above. "
            "If the Context does not mention what they asked (e.g. a specific teacher's contact), "
            "say that the indexed documents do not list it—do not make up names or numbers."
        )
        messages.append({"role": "user", "content": user_message})
        return PromptPayload(messages=messages, source_urls=source_urls)
