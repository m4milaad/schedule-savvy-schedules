from __future__ import annotations

import concurrent.futures
import logging
import threading
import time
from dataclasses import dataclass
from typing import Literal

import httpx

from backend.config import Settings


logger = logging.getLogger(__name__)

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_OPENROUTER_RETRYABLE = frozenset({429, 502, 503})

ModelStatus = Literal["loading", "ready", "demo_only"]


@dataclass(slots=True)
class ModelState:
    backend: str
    status: ModelStatus
    loaded: bool


class ModelRouter:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._generator = None
        self._ollama_client = None
        self._backend_in_use = "demo" if settings.demo_mode else "loading"
        self._status: ModelStatus = "demo_only" if settings.demo_mode else "loading"
        self._lock = threading.Lock()
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

    def _check_ollama(self) -> bool:
        try:
            with httpx.Client(timeout=2.5) as client:
                res = client.get(f"{self.settings.ollama_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    def _load_hf_pipeline(self, model_name: str):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float32)
        return pipeline("text-generation", model=model, tokenizer=tokenizer)

    def load(self) -> None:
        if self.settings.demo_mode:
            return
        with self._lock:
            requested = self.settings.model_backend
            if requested == "openrouter":
                if self.settings.openrouter_api_key:
                    self._backend_in_use = "openrouter"
                    self._status = "ready"
                    return
                logger.warning(
                    "MODEL_BACKEND=openrouter but OPENROUTER_API_KEY is empty; falling back to tinyllama",
                )
                self._backend_in_use = "tinyllama"
                self._status = "ready"
                return
            if requested == "ollama" and self._check_ollama():
                import ollama

                self._ollama_client = ollama.Client(host=self.settings.ollama_url)
                self._backend_in_use = "ollama"
                self._status = "ready"
                return
            # Keep HF load lazy/optional on constrained environments.
            self._backend_in_use = requested
            self._status = "ready"

    @property
    def state(self) -> ModelState:
        return ModelState(backend=self._backend_in_use, status=self._status, loaded=self._status == "ready")

    @staticmethod
    def _hf_prompt_from_messages(tokenizer, messages: list[dict[str, str]]) -> str:
        if getattr(tokenizer, "chat_template", None):
            return tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        parts: list[str] = []
        for message in messages:
            role = (message.get("role") or "user").strip()
            content = (message.get("content") or "").strip()
            parts.append(f"{role.capitalize()}:\n{content}\n")
        parts.append("Assistant:\n")
        return "\n".join(parts)

    def _openrouter_sync(self, messages: list[dict[str, str]]) -> str:
        headers: dict[str, str] = {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        if self.settings.openrouter_site_url:
            headers["HTTP-Referer"] = self.settings.openrouter_site_url
        if self.settings.openrouter_site_name:
            headers["X-OpenRouter-Title"] = self.settings.openrouter_site_name

        payload = {
            "model": self.settings.openrouter_model,
            "messages": messages,
            "max_tokens": self.settings.max_tokens,
            "temperature": 0.1,
        }

        timeout = self.settings.openrouter_timeout_seconds
        last_error: Exception | None = None
        max_attempts = self.settings.openrouter_max_retries + 1

        for attempt in range(1, max_attempts + 1):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(_OPENROUTER_URL, headers=headers, json=payload)

                if response.status_code in _OPENROUTER_RETRYABLE and attempt < max_attempts:
                    wait = min(2**attempt, 8)
                    logger.warning(
                        "openrouter HTTP %s, retry %s/%s in %ss",
                        response.status_code,
                        attempt,
                        max_attempts,
                        wait,
                    )
                    time.sleep(wait)
                    continue

                response.raise_for_status()
                data = response.json()
                if "error" in data:
                    err = data.get("error")
                    logger.error("openrouter API error: %s", err)
                    return "The assistant could not reach the language model. Please try again shortly."

                content = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )
                return content or "No answer returned from the model."

            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning("openrouter timeout attempt %s/%s", attempt, max_attempts)
            except Exception as exc:
                last_error = exc
                logger.error("openrouter request failed: %s", exc)
                break

        return (
            "The assistant could not reach OpenRouter. Check OPENROUTER_API_KEY and network, then retry."
            if last_error
            else "OpenRouter request failed."
        )

    def _generate_sync(self, messages: list[dict[str, str]]) -> str:
        if self.settings.demo_mode:
            return "[DEMO_MODE] Answer generated from retrieved CUK/UGC context."

        if self._backend_in_use == "openrouter":
            return self._openrouter_sync(messages)

        if self._backend_in_use == "ollama":
            if self._ollama_client is None:
                import ollama

                self._ollama_client = ollama.Client(host=self.settings.ollama_url)
            result = self._ollama_client.chat(
                model="phi3.5:3.8b",
                messages=list(messages),
                options={"temperature": 0.1, "num_predict": self.settings.max_tokens},
            )
            if isinstance(result, dict):
                msg = result.get("message") or {}
                return (msg.get("content") or "").strip()
            content = getattr(result.message, "content", None) if result.message else None
            return (content or "").strip()

        if self._generator is None:
            # Keep startup responsive; on first real generation try tiny model.
            self._generator = self._load_hf_pipeline(self.settings.tinyllama_model)
        tokenizer = self._generator.tokenizer
        prompt = self._hf_prompt_from_messages(tokenizer, messages)
        out = self._generator(prompt, max_new_tokens=self.settings.max_tokens, do_sample=False, return_full_text=False)
        return (out[0].get("generated_text", "") or "").strip()

    def generate(self, messages: list[dict[str, str]]) -> str:
        future = self._executor.submit(self._generate_sync, messages)
        wait_s = self.settings.model_timeout_seconds
        if self._backend_in_use == "openrouter":
            wait_s = int(self.settings.openrouter_timeout_seconds) + 5
        try:
            return future.result(timeout=wait_s)
        except concurrent.futures.TimeoutError:
            return "The model is taking too long to respond. Please try a shorter question."
