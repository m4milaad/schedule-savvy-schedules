from __future__ import annotations

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.embeddings import EmbeddingService
from app.llm import AnswerGenerator
from app.models import ChatRequest, ChatResponse, SearchResponse
from app.retriever import Retriever
from app.service import RagService
from app.vector_store import VectorStore

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client = httpx.AsyncClient(
        http2=False,
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        timeout=httpx.Timeout(settings.request_timeout_seconds, connect=10.0),
    )

    embedding_service = EmbeddingService(settings.embedding_model_name)
    vector_store = VectorStore.load(
        index_path=settings.faiss_index_path,
        metadata_path=settings.faiss_metadata_path,
    )
    retriever = Retriever(embedding_service=embedding_service, vector_store=vector_store)
    generator = AnswerGenerator(
        mode=settings.answer_mode,
        tinyllama_model_name=settings.tinyllama_model_name,
        max_new_tokens=settings.model_max_new_tokens,
        temperature=settings.model_temperature,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        timeout_seconds=settings.request_timeout_seconds,
        openrouter_api_key=settings.openrouter_api_key,
        openrouter_model=settings.openrouter_model,
        openrouter_site_url=settings.openrouter_site_url,
        openrouter_site_name=settings.openrouter_site_name,
        openrouter_max_retries=settings.openrouter_max_retries,
        http_client=http_client,
    )
    app.state.rag = RagService(
        settings=settings,
        retriever=retriever,
        generator=generator,
    )
    app.state.http_client = http_client
    yield
    await http_client.aclose()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
async def search(payload: ChatRequest) -> SearchResponse:
    rag: RagService = app.state.rag
    return await rag.search(query=payload.query, top_k=payload.top_k)


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    rag: RagService = app.state.rag
    try:
        return await rag.chat(query=payload.query, top_k=payload.top_k)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
