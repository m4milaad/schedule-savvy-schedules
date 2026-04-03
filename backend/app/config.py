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

    answer_mode: Literal["extractive", "tinyllama", "ollama", "openrouter"] = "extractive"
    tinyllama_model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    model_max_new_tokens: int = 512
    model_temperature: float = 0.15

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "phi3:mini"

    openrouter_api_key: str | None = None
    openrouter_model: str = "liquid/lfm-2.5-1.2b-instruct:free"
    openrouter_site_url: str | None = None
    openrouter_site_name: str | None = None
    openrouter_max_retries: int = 2

    cache_ttl_seconds: int = 300
    cache_max_items: int = 512

    request_timeout_seconds: int = Field(default=45, ge=5, le=120)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
