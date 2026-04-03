from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(min_length=2, max_length=600)
    top_k: int | None = Field(default=None, ge=1, le=15)


class SourceDocument(BaseModel):
    source_url: str
    page_title: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceDocument]
    mode: str


class SearchResponse(BaseModel):
    query: str
    documents: list[SourceDocument]
