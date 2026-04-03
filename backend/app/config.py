from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "CUK Hybrid RAG Chatbot"
    app_env: str = "production"
    log_level: str = "INFO"
    cors_origins: str = "*"

    faiss_index_path: Path = DATA_DIR / "faiss_index.bin"
    faiss_metadata_path: Path = DATA_DIR / "metadata.json"
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    retrieval_top_k: int = 5
    retrieval_score_threshold: float = 0.28
    max_context_chars: int = 5000

    exa_api_key: str | None = None
    exa_fallback_results: int = 3

    answer_mode: Literal["extractive", "tinyllama", "ollama"] = "extractive"
    tinyllama_model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    model_max_new_tokens: int = 220
    model_temperature: float = 0.2

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "phi3:mini"

    cache_ttl_seconds: int = 600
    cache_max_items: int = 512

    request_timeout_seconds: int = Field(default=20, ge=5, le=120)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
