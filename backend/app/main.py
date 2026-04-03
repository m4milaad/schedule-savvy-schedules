from __future__ import annotations

from contextlib import asynccontextmanager

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
    )
    app.state.rag = RagService(
        settings=settings,
        retriever=retriever,
        generator=generator,
    )
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
def search(payload: ChatRequest) -> SearchResponse:
    rag: RagService = app.state.rag
    return rag.search(query=payload.query, top_k=payload.top_k)


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    rag: RagService = app.state.rag
    try:
        return rag.chat(query=payload.query, top_k=payload.top_k)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
