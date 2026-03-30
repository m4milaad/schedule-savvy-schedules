from __future__ import annotations

from typing import Literal

import requests
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline


class AnswerGenerator:
    def __init__(
        self,
        mode: Literal["extractive", "tinyllama", "ollama"],
        tinyllama_model_name: str,
        max_new_tokens: int,
        temperature: float,
        ollama_base_url: str,
        ollama_model: str,
        timeout_seconds: int,
    ):
        self.mode = mode
        self.max_new_tokens = max_new_tokens
        self.temperature = temperature
        self.ollama_base_url = ollama_base_url.rstrip("/")
        self.ollama_model = ollama_model
        self.timeout_seconds = timeout_seconds
        self._pipe = None

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
            response = requests.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            content = response.json().get("response", "").strip()
            return content or self._extractive_answer(question, context_blocks)
        except Exception:
            return self._extractive_answer(question, context_blocks)

    def answer(self, question: str, context_blocks: list[str]) -> str:
        if self.mode == "tinyllama":
            return self._tinyllama_answer(question, context_blocks)
        if self.mode == "ollama":
            return self._ollama_answer(question, context_blocks)
        return self._extractive_answer(question, context_blocks)
