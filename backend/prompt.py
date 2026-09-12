from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable

from backend.rag import RetrievedChunk
from backend.text_cleanup import clean_text_artifacts

SYSTEM_PROMPT = (
    "You are NeMoX, the official AI Assistant for Central University of Kashmir (CUK).\n"
    "Your goal is to answer student, faculty, and visitor questions clearly, accurately, and politely using ONLY the supplied Context.\n\n"
    "Rules:\n"
    "1. When the Context mentions facts relevant to the question—dates, deadlines, CUET/CUCET, fees, eligibility, programs, processes, staff names, emails, phone numbers, departments—state them clearly.\n"
    "2. If the user asks for contact information, list every matching name, designation, email, and phone number found in the Context.\n"
    "3. PRESENTATION RULES:\n"
    "   - Write in a professional, clear Markdown format.\n"
    "   - Use short sections, bullet points, or numbered steps for readability.\n"
    "   - When presenting repeated structured records (courses, contact lists, notices, timetables, fee structures), USE A MARKDOWN TABLE.\n"
    "   - For contact information, use table columns: | Name | Designation | Department | Email / Contact | Source |\n"
    "   - Never invent or guess contacts, dates, or policies not present in the Context.\n"
    "4. CITATIONS: Include citations like [1] or [2] at the end of key factual statements or bullets, matching the numbered sources provided.\n"
    "5. If the Context is empty or does not answer the specific question, state clearly that the indexed university materials do not contain this information, and suggest checking the official portal (cukashmir.ac.in) or contacting the relevant office."
)


@dataclass(slots=True)
class PromptPayload:
    """Structured turns for chat-templated models."""

    messages: list[dict[str, str]]
    source_urls: list[str]


class PromptBuilder:
    def __init__(self, token_limit: int = 4500):
        self.token_limit = token_limit
        self.tokenizer = None

    def _get_tokenizer(self):
        if self.tokenizer is None:
            try:
                from transformers import AutoTokenizer
                self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
            except Exception:
                self.tokenizer = None
        return self.tokenizer

    def _count_tokens(self, text: str) -> int:
        tok = self._get_tokenizer()
        if tok is not None:
            try:
                return len(tok.encode(text, add_special_tokens=False))
            except Exception:
                pass
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
        for turn in history[-6:]:
            role = turn.get("role")
            content = (turn.get("content") or "").strip()
            if role not in ("user", "assistant") or not content:
                continue
            messages.append({"role": role, "content": clean_text_artifacts(content)})

        user_header = f"Question:\n{query.strip()}\n\nRetrieved University Context:\n"
        used_tokens = self._count_tokens(user_header)

        chunk_list = list(chunks)
        q = query.lower()
        contact_intent = any(k in q for k in ("contact", "email", "phone", "mobile", "teacher", "faculty", "hod"))
        if contact_intent:
            def score_chunk(c: RetrievedChunk) -> tuple[int, int, float]:
                text = c.text.lower()
                url = c.source_url.lower()
                has_contact = 1 if re.search(r"\b(email|phone|mobile|tel|contact)\b|@", text) else 0
                source_bias = 1 if any(k in url for k in ("departlist", "department", "heads-coordinators", "contact")) else 0
                return (has_contact, source_bias, c.score)
            chunk_list.sort(key=score_chunk, reverse=True)

        for index, chunk in enumerate(chunk_list, start=1):
            title = clean_text_artifacts(chunk.page_title or "Official CUK Page")
            content = clean_text_artifacts(chunk.text)
            block = (
                f"[{index}] Title: {title}\n"
                f"URL: {chunk.source_url}\n"
                f"Content:\n{content}\n"
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
            "Respond to the user in clean Markdown. Ground all claims in the retrieved context blocks above. "
            "If the information is not in the context, explicitly mention it is unavailable in the indexed data."
        )
        messages.append({"role": "user", "content": user_message})
        return PromptPayload(messages=messages, source_urls=source_urls)

