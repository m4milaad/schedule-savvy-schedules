from __future__ import annotations

import re

_PRONOUN_RE = re.compile(r"\b(he|his|him|she|her|hers|their|them|they|it|its|that|this|fee|fees|eligibility|requirements|admission|syllabus)\b", re.IGNORECASE)
_NAME_RE = re.compile(
    r"\b(?:Prof\.?|Professor|Dr\.?|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b"
)
_TOPIC_RE = re.compile(r"\b(MBA|M\.Tech|B\.Tech|Biotechnology|Physics|Chemistry|Law|English|Mathematics|Economics|Admissions|Hostel|Library|Examination|Results)\b", re.IGNORECASE)

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
    out = re.sub(r"\b(him|them|they|he|she|hers|it|its)\b", entity, out, flags=re.IGNORECASE)
    return out


def _extract_recent_context(history: list[dict[str, str]]) -> str | None:
    # 1. Search for person names in reverse turn order
    for turn in reversed(history):
        for key in ("content", "bot", "assistant", "text", "user"):
            value = (turn.get(key) or "").strip()
            if not value:
                continue
            matches = _NAME_RE.findall(value)
            for candidate in reversed(matches):
                cleaned = " ".join(candidate.split()).strip()
                if len(cleaned.split()) >= 2 and cleaned not in _STOP_WORDS:
                    return cleaned
                    
    # 2. Search for prominent department or course topics
    for turn in reversed(history):
        for key in ("content", "bot", "assistant", "text", "user"):
            value = (turn.get(key) or "").strip()
            if not value:
                continue
            topic_match = _TOPIC_RE.search(value)
            if topic_match:
                return topic_match.group(0)

    return None


def rewrite_query(query: str, history: list[dict[str, str]], enabled: bool = True) -> str:
    clean = (query or "").strip()
    if not clean or not enabled or not history:
        return clean
        
    if not _PRONOUN_RE.search(clean):
        return clean
        
    context_entity = _extract_recent_context(history)
    if not context_entity:
        return clean
        
    # If the user query is very short or implicit (e.g. "what is the fee?", "how to apply?"), append the context
    if len(clean.split()) <= 4 and context_entity.lower() not in clean.lower():
        return f"{clean} for {context_entity}"
        
    rewritten = _possessive_rewrite(clean, context_entity)
    return rewritten

