from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(min_length=2, max_length=600)
    top_k: int | None = Field(default=None, ge=1, le=15)


class SourceDocument(BaseModel):
    id: str
    title: str
    url: str
    source: str
    category: str
    snippet: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    source: str
    used_fallback: bool
    latency_ms: int
    documents: list[SourceDocument]


class SearchResponse(BaseModel):
    query: str
    documents: list[SourceDocument]
