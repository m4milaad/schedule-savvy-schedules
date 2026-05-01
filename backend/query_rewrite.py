from __future__ import annotations

import re

_PRONOUN_RE = re.compile(r"\b(he|his|him|she|her|hers|their|them|they)\b", re.IGNORECASE)
_NAME_RE = re.compile(
    r"\b(?:Prof\.?|Professor|Dr\.?|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b"
)
_STOP_WORDS = {
    "Central University",
    "University Kashmir",
    "Please Contact",
    "No Relevant",
    "Based On",
    "Department Of",
    "School Of",
}


def _possessive_rewrite(query: str, entity: str) -> str:
    # Preserve possessive grammar for "his/her/their" style questions.
    out = re.sub(r"\b(his|her|their)\b", f"{entity}'s", query, flags=re.IGNORECASE)
    out = re.sub(r"\b(him|them|they|he|she|hers)\b", entity, out, flags=re.IGNORECASE)
    return out


def _extract_recent_entity(history: list[dict[str, str]]) -> str | None:
    for turn in reversed(history):
        for key in ("content", "bot", "assistant", "text"):
            value = (turn.get(key) or "").strip()
            if not value:
                continue
            matches = _NAME_RE.findall(value)
            for candidate in reversed(matches):
                cleaned = " ".join(candidate.split()).strip()
                if len(cleaned.split()) >= 2 and cleaned not in _STOP_WORDS:
                    return cleaned
    return None


def rewrite_query(query: str, history: list[dict[str, str]], enabled: bool = True) -> str:
    clean = (query or "").strip()
    if not clean or not enabled:
        return clean
    if not _PRONOUN_RE.search(clean):
        return clean
    entity = _extract_recent_entity(history)
    if not entity:
        return clean
    rewritten = _possessive_rewrite(clean, entity)
    return rewritten
