from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from transformers import AutoTokenizer

from backend.rag import RetrievedChunk


SYSTEM_PROMPT = (
    "You are the official AI assistant of Central University of Kashmir. "
    "Answer ONLY from the provided context. If the answer is not in the context, "
    "say: 'I don't have this information. Please visit cukashmir.ac.in or call the "
    "admissions office.' Never guess."
)


@dataclass(slots=True)
class PromptPayload:
    prompt: str
    source_urls: list[str]


class PromptBuilder:
    def __init__(self, token_limit: int = 1800):
        self.token_limit = token_limit
        self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

    def _count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text, add_special_tokens=False))

    def build(self, query: str, chunks: Iterable[RetrievedChunk]) -> PromptPayload:
        selected_blocks: list[str] = []
        source_urls: list[str] = []

        base = f"System:\n{SYSTEM_PROMPT}\n\nQuestion:\n{query}\n\nContext:\n"
        used_tokens = self._count_tokens(base)

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
        prompt = (
            f"{base}{context}\n\n"
            "Instruction:\n"
            "Provide a concise, factual answer grounded in the context. "
            "When relevant include source URLs from the context."
        )
        return PromptPayload(prompt=prompt, source_urls=source_urls)
