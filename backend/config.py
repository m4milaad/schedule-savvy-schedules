from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"

load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name, str(default)).strip().lower()
    return value in {"1", "true", "yes", "on"}


def _list_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(slots=True)
class Settings:
    demo_mode: bool = _bool_env("DEMO_MODE", False)
    model_backend: str = os.getenv("MODEL_BACKEND", "tinyllama").strip().lower()
    ollama_url: str = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "").strip()
    openrouter_model: str = os.getenv(
        "OPENROUTER_MODEL",
        "liquid/lfm-2.5-1.2b-instruct:free",
    ).strip()
    openrouter_site_url: str = os.getenv("OPENROUTER_SITE_URL", "").strip() or None
    openrouter_site_name: str = os.getenv("OPENROUTER_SITE_NAME", "").strip() or None
    openrouter_max_retries: int = int(os.getenv("OPENROUTER_MAX_RETRIES", "2"))
    openrouter_timeout_seconds: float = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "60"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    max_tokens: int = int(os.getenv("MAX_TOKENS", "300"))
    confidence_threshold: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
    rag_store: str = os.getenv("RAG_STORE", "supabase").strip().lower()

    supabase_url: str = os.getenv("SUPABASE_URL", "").strip()
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    cors_origins: list[str] = None  # type: ignore[assignment]

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    tinyllama_model: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    phi3_model: str = "microsoft/Phi-3-mini-4k-instruct"

    faiss_index_path: Path = DATA_DIR / "faiss_index.bin"
    metadata_path: Path = DATA_DIR / "metadata.json"

    @property
    def model_timeout_seconds(self) -> int:
        return 15

    def __post_init__(self) -> None:
        if self.cors_origins is None:
            self.cors_origins = _list_env("CORS_ORIGINS", "http://localhost:8080,http://localhost:5173")
