import asyncio
import hashlib
import json
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

from fastapi import Body, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from backend.config import Settings
from backend.model import ModelRouter
from backend.prompt import PromptBuilder
from backend.rag import RagPipeline, RetrievedChunk


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "time": int(record.created * 1000),
        }
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            payload.update(record.extra)
        return json.dumps(payload, ensure_ascii=False)


def setup_logger(level: str) -> logging.Logger:
    logger = logging.getLogger("cuk-rag")
    logger.setLevel(level)
    logger.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.propagate = False
    return logger


class ChatTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=1200)


class ChatRequest(BaseModel):
    query: str = Field(min_length=2, max_length=600)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=600)


@dataclass(slots=True)
class CachedResponse:
    payload: dict[str, Any]
    created_at: float


settings = Settings()
logger = setup_logger(settings.log_level)
limiter = Limiter(key_func=get_remote_address)
started_at = time.time()
logger.info(
    "process_bootstrap",
    extra={
        "extra": {
            "python_runtime_configured": "PYTHON_VERSION env expected on platform",
            "demo_mode": settings.demo_mode,
            "rag_store": settings.rag_store,
        }
    },
)

query_cache: dict[str, CachedResponse] = {}


def _chat_cache_key(query: str, history: list[ChatTurn]) -> str:
    compact_history = [{"role": t.role, "content": t.content.strip()} for t in history[-8:]]
    payload = json.dumps(
        {"query": query.strip().lower(), "history": compact_history},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _serialize_sources(chunks: list[RetrievedChunk]) -> list[dict[str, Any]]:
    return [
        {
            "source_url": c.source_url,
            "page_title": c.page_title,
            "date_scraped": c.date_scraped,
            "chunk_index": c.chunk_index,
            "score": round(c.score, 4),
        }
        for c in chunks
    ]


def _cacheable_answer(answer: str) -> bool:
    low = answer.lower().strip()
    bad = (
        "[demo_mode]",
        "taking too long",
        "could not reach openrouter",
        "could not reach the language model",
    )
    return bool(low) and not any(x in low for x in bad)


@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.perf_counter()
    rag = RagPipeline(settings=settings)
    rag.load_index()
    app.state.rag = rag
    app.state.prompt_builder = PromptBuilder(token_limit=4500)
    app.state.model_router = ModelRouter(settings=settings)
    app.state.model_status = "demo_only" if settings.demo_mode else "loading"

    if not settings.demo_mode:
        async def _load_model_bg() -> None:
            try:
                await asyncio.to_thread(app.state.model_router.load)
                app.state.model_status = app.state.model_router.state.status
            except Exception:
                app.state.model_status = "loading"
        asyncio.create_task(_load_model_bg())

    startup_ms = int((time.perf_counter() - t0) * 1000)
    logger.info("startup_complete", extra={"extra": {"startup_ms": startup_ms, "index_size": rag.index_size}})
    yield


app = FastAPI(title="CUK Hybrid RAG API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials="*" not in settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, exc: Exception):
    logger.error("unhandled_exception", extra={"extra": {"error": str(exc)}})
    return JSONResponse(status_code=500, content={"error": "Service temporarily unavailable"})


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/health")


@app.get("/ping")
async def ping() -> dict[str, bool]:
    return {"ok": True}


@app.get("/health")
async def health() -> dict[str, Any]:
    model_state = app.state.model_router.state
    return {
        "status": "ok",
        "model_loaded": model_state.loaded,
        "model_status": app.state.model_status,
        "rag_store": settings.rag_store,
        "cors_origins": settings.cors_origins,
        "index_size": app.state.rag.index_size,
        "uptime_seconds": int(time.time() - started_at),
    }


@app.post("/search")
async def search(payload: SearchRequest) -> dict[str, Any]:
    retrieval = app.state.rag.retrieve(payload.query)
    return {
        "mode": retrieval.mode,
        "confidence": round(retrieval.confidence, 4),
        "chunks": [
            {
                "text": c.text,
                "source_url": c.source_url,
                "page_title": c.page_title,
                "date_scraped": c.date_scraped,
                "chunk_index": c.chunk_index,
                "score": round(c.score, 4),
            }
            for c in retrieval.chunks
        ],
    }


@app.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, payload: ChatRequest = Body(...)) -> dict[str, Any]:
    t0 = time.perf_counter()
    key = _chat_cache_key(payload.query, payload.history)
    cached = query_cache.get(key)
    now = time.time()
    if cached and now - cached.created_at <= settings.cache_ttl_seconds:
        response = dict(cached.payload)
        response["mode"] = "cached"
        logger.info(
            "chat_request",
            extra={"extra": {"query": payload.query, "mode": "cached", "latency_ms": int((time.perf_counter()-t0)*1000), "chunk_count": len(response.get("sources", []))}},
        )
        return response
    if cached and now - cached.created_at > settings.cache_ttl_seconds:
        query_cache.pop(key, None)

    retrieval = app.state.rag.retrieve(payload.query)
    prompt_payload = app.state.prompt_builder.build(
        query=payload.query,
        chunks=retrieval.chunks,
        history=[{"role": turn.role, "content": turn.content} for turn in payload.history[-8:]],
    )

    mode = retrieval.mode
    if settings.demo_mode or app.state.model_status != "ready":
        top = retrieval.chunks[0].text[:420] if retrieval.chunks else "No relevant chunk found."
        answer = f"[DEMO_MODE] Based on indexed context:\n{top}"
        mode = "demo"
    else:
        answer = app.state.model_router.generate(prompt_payload.messages)

    response = {
        "answer": answer,
        "sources": _serialize_sources(retrieval.chunks),
        "mode": mode,
    }
    if _cacheable_answer(answer):
        query_cache[key] = CachedResponse(payload=response, created_at=now)

    logger.info(
        "chat_request",
        extra={
            "extra": {
                "query": payload.query,
                "mode": mode,
                "latency_ms": int((time.perf_counter() - t0) * 1000),
                "chunk_count": len(retrieval.chunks),
            }
        },
    )
    _ = request
    return response


@app.post("/chat/stream")
@limiter.limit("20/minute")
async def chat_stream(request: Request, payload: ChatRequest = Body(...)) -> StreamingResponse:
    """Server-sent events style streaming endpoint.

    The response is a text/event-stream where the server sends:
      - one initial 'meta' event with mode and sources
      - a sequence of 'token' events containing pieces of the answer
    """
    t0 = time.perf_counter()
    retrieval = app.state.rag.retrieve(payload.query)
    prompt_payload = app.state.prompt_builder.build(
        query=payload.query,
        chunks=retrieval.chunks,
        history=[{"role": turn.role, "content": turn.content} for turn in payload.history[-8:]],
    )

    mode = retrieval.mode
    if settings.demo_mode or app.state.model_status != "ready":
        top = retrieval.chunks[0].text[:420] if retrieval.chunks else "No relevant chunk found."
        answer = f"[DEMO_MODE] Based on indexed context:\n{top}"
        mode = "demo"
    else:
        answer = app.state.model_router.generate(prompt_payload.messages)

    sources = _serialize_sources(retrieval.chunks)

    async def event_generator() -> Any:
        # Initial metadata event
        meta = {"type": "meta", "mode": mode, "sources": sources}
        yield f"data: {json.dumps(meta)}\n\n"

        # Stream the answer as whitespace-delimited tokens for a simple typing effect.
        for token in answer.split():
            chunk = {"type": "token", "token": token + " "}
            yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(0)  # yield control to the event loop

        done = {
            "type": "done",
            "latency_ms": int((time.perf_counter() - t0) * 1000),
            "chunk_count": len(retrieval.chunks),
        }
        yield f"data: {json.dumps(done)}\n\n"

    _ = request
    return StreamingResponse(event_generator(), media_type="text/event-stream")
