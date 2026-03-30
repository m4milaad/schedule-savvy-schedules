from __future__ import annotations

from dataclasses import dataclass

from exa_py import Exa


@dataclass
class ExaSnippet:
    title: str
    url: str
    text: str


class ExaFallbackClient:
    def __init__(self, api_key: str | None):
        self._enabled = bool(api_key)
        self._client = Exa(api_key=api_key) if api_key else None

    @property
    def enabled(self) -> bool:
        return self._enabled

    def search(self, query: str, num_results: int = 3, max_chars: int = 1200) -> list[ExaSnippet]:
        if not self._enabled or self._client is None:
            return []

        result = self._client.search_and_contents(
            query=query,
            num_results=num_results,
            type="auto",
            text=True,
        )
        snippets: list[ExaSnippet] = []
        for item in getattr(result, "results", []):
            text = (getattr(item, "text", "") or "").strip()
            snippets.append(
                ExaSnippet(
                    title=(getattr(item, "title", "") or "External Result").strip(),
                    url=(getattr(item, "url", "") or "").strip(),
                    text=text[:max_chars],
                )
            )
        return [snippet for snippet in snippets if snippet.url and snippet.text]
