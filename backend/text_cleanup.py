from __future__ import annotations

import re

TYPOGRAPHY_TRANSLATION = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201b": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u201f": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "\u2026": "...",
        "\u00a0": " ",
        "\u00a2": "\n",
        "\uf0b7": "-",
        "\u2022": "-",
        "\u25cf": "-",
    }
)

MOJIBAKE_REPLACEMENTS = {
    "â€œ": '"',
    "â€\x9d": '"',
    "â€˜": "'",
    "â€™": "'",
    "â€“": "-",
    "â€”": "-",
    "â€¦": "...",
    "â€¢": "-",
    "Â": "",
}

BROKEN_UTF8_MARKER_RE = re.compile(r"â[\x80-\x9f\ufffd\u25a1\u25a0]{1,4}")
REPLACEMENT_GLYPH_RE = re.compile(r"[\ufffd\u25a1\u25a0]+")


def clean_text_artifacts(text: str, *, strip: bool = True) -> str:
    """Repair common PDF/LLM mojibake and spacing artifacts."""
    if not text:
        return ""

    cleaned = text.translate(TYPOGRAPHY_TRANSLATION)
    for bad, good in MOJIBAKE_REPLACEMENTS.items():
        cleaned = cleaned.replace(bad, good)

    cleaned = BROKEN_UTF8_MARKER_RE.sub("", cleaned)
    cleaned = REPLACEMENT_GLYPH_RE.sub("", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\s+([,.!?;:])", r"\1", cleaned)
    return cleaned.strip() if strip else cleaned
