from __future__ import annotations

import asyncio
import logging
import time
from typing import Literal

import httpx
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

logger = logging.getLogger(__name__)

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_RETRYABLE_STATUS = frozenset({429, 502, 503})


class AnswerGenerator:
    def __init__(
        self,
        mode: Literal["extractive", "tinyllama", "ollama", "openrouter"],
        tinyllama_model_name: str,
        max_new_tokens: int,
        temperature: float,
        ollama_base_url: str,
        ollama_model: str,
        timeout_seconds: int,
        openrouter_api_key: str | None,
        openrouter_model: str,
        openrouter_site_url: str | None,
        openrouter_site_name: str | None,
        openrouter_max_retries: int = 2,
        http_client: httpx.AsyncClient | None = None,
    ):
        self.mode = mode
        self.max_new_tokens = max_new_tokens
        self.temperature = temperature
        self.ollama_base_url = ollama_base_url.rstrip("/")
        self.ollama_model = ollama_model
        self.timeout_seconds = timeout_seconds
        self.openrouter_api_key = openrouter_api_key
        self.openrouter_model = openrouter_model
        self.openrouter_max_retries = openrouter_max_retries
        self._pipe = None

        self._http_client = http_client

        self._openrouter_headers: dict[str, str] = {}
        if openrouter_api_key:
            self._openrouter_headers["Authorization"] = f"Bearer {openrouter_api_key}"
            self._openrouter_headers["Content-Type"] = "application/json"
            if openrouter_site_url:
                self._openrouter_headers["HTTP-Referer"] = openrouter_site_url
            if openrouter_site_name:
                self._openrouter_headers["X-OpenRouter-Title"] = openrouter_site_name

        if self.mode == "tinyllama":
            tokenizer = AutoTokenizer.from_pretrained(tinyllama_model_name)
            model = AutoModelForCausalLM.from_pretrained(tinyllama_model_name)
            self._pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)

    @staticmethod
    def _extractive_answer(question: str, context_blocks: list[str]) -> str:
        if not context_blocks:
            return "I do not have enough indexed evidence to answer confidently."
        joined = "\n\n".join(context_blocks)
        return (
            "Based on the retrieved university/UGC content:\n\n"
            f"{joined[:2200]}\n\n"
            "Answer policy: Please verify dates and deadlines on the cited source links."
        )

    def _tinyllama_answer(self, question: str, context_blocks: list[str]) -> str:
        if not self._pipe:
            return self._extractive_answer(question, context_blocks)
        context = "\n\n".join(context_blocks)[:3500]
        prompt = (
            "You are an academic assistant for Central University of Kashmir. "
            "Answer only from the provided context. If unsure, say you don't know.\n\n"
            f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
        )
        out = self._pipe(
            prompt,
            max_new_tokens=self.max_new_tokens,
            do_sample=self.temperature > 0,
            temperature=self.temperature,
            return_full_text=False,
        )
        text = (out[0].get("generated_text", "") or "").strip()
        return text or self._extractive_answer(question, context_blocks)

    def _ollama_answer(self, question: str, context_blocks: list[str]) -> str:
        context = "\n\n".join(context_blocks)[:5000]
        payload = {
            "model": self.ollama_model,
            "prompt": (
                "You are an academic assistant for Central University of Kashmir. "
                "Use only the context. If missing, clearly say so.\n\n"
                f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
            ),
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_new_tokens,
            },
        }
        try:
            response = httpx.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            content = response.json().get("response", "").strip()
            return content or self._extractive_answer(question, context_blocks)
        except Exception:
            return self._extractive_answer(question, context_blocks)

    async def _openrouter_answer(self, question: str, context_blocks: list[str]) -> str:
        if not self.openrouter_api_key or not self._http_client:
            logger.warning("openrouter not configured, falling back to extractive")
            return self._extractive_answer(question, context_blocks)

        context = "\n\n".join(context_blocks)
        system_prompt = (
            "You are NeMoX, a helpful academic assistant for Central University of Kashmir (CUK). "
            "Your job is to answer questions accurately using ONLY the context provided below.\n\n"
            "RULES:\n"
            "1. Extract and quote specific details from the context: names, emails, phone numbers, "
            "dates, deadlines, course names, department names, etc.\n"
            "2. If the context contains the answer, give it directly — do NOT say 'check official sources' "
            "when the information is right there.\n"
            "3. If the context genuinely does not contain the information, say so clearly and suggest "
            "checking the official CUK website.\n"
            "4. Be concise but complete. Prefer bullet points for lists.\n"
            "5. Never make up information that is not in the context."
        )

        payload = {
            "model": self.openrouter_model,
            "max_tokens": self.max_new_tokens,
            "temperature": self.temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
            ],
        }

        last_error: Exception | None = None
        for attempt in range(1, self.openrouter_max_retries + 2):
            try:
                t0 = time.perf_counter()
                response = await self._http_client.post(
                    _OPENROUTER_URL,
                    headers=self._openrouter_headers,
                    json=payload,
                    timeout=self.timeout_seconds,
                )
                latency_ms = int((time.perf_counter() - t0) * 1000)

                if response.status_code in _RETRYABLE_STATUS and attempt <= self.openrouter_max_retries:
                    wait = min(2 ** attempt, 8)
                    logger.warning(
                        "openrouter transient error %d, retry %d/%d in %ds",
                        response.status_code, attempt, self.openrouter_max_retries, wait,
                    )
                    await asyncio.sleep(wait)
                    continue

                response.raise_for_status()
                data = response.json()

                if "error" in data:
                    logger.error("openrouter API error: %s", data["error"])
                    return self._extractive_answer(question, context_blocks)

                content = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )
                logger.info("openrouter ok in %dms, tokens=%s", latency_ms, data.get("usage", {}))
                return content or self._extractive_answer(question, context_blocks)

            except httpx.TimeoutException:
                last_error = TimeoutError(f"OpenRouter timed out after {self.timeout_seconds}s")
                logger.warning("openrouter timeout attempt %d/%d", attempt, self.openrouter_max_retries + 1)
            except Exception as exc:
                last_error = exc
                logger.error("openrouter request failed: %s", exc)
                break

        logger.error("openrouter all attempts failed: %s", last_error)
        return self._extractive_answer(question, context_blocks)

    async def answer(self, question: str, context_blocks: list[str]) -> str:
        if self.mode == "tinyllama":
            return self._tinyllama_answer(question, context_blocks)
        if self.mode == "ollama":
            return self._ollama_answer(question, context_blocks)
        if self.mode == "openrouter":
            return await self._openrouter_answer(question, context_blocks)
        return self._extractive_answer(question, context_blocks)
