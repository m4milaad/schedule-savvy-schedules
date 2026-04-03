from __future__ import annotations

import concurrent.futures
import threading
from dataclasses import dataclass
from typing import Literal

import httpx

from backend.config import Settings


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

    def _generate_sync(self, prompt: str) -> str:
        if self.settings.demo_mode:
            return "[DEMO_MODE] Answer generated from retrieved CUK/UGC context."

        if self._backend_in_use == "ollama":
            if self._ollama_client is None:
                import ollama

                self._ollama_client = ollama.Client(host=self.settings.ollama_url)
            result = self._ollama_client.generate(
                model="phi3.5:3.8b",
                prompt=prompt,
                options={"temperature": 0.1, "num_predict": self.settings.max_tokens},
            )
            return (result.get("response", "") or "").strip()

        if self._generator is None:
            # Keep startup responsive; on first real generation try tiny model.
            self._generator = self._load_hf_pipeline(self.settings.tinyllama_model)
        out = self._generator(prompt, max_new_tokens=self.settings.max_tokens, do_sample=False, return_full_text=False)
        return (out[0].get("generated_text", "") or "").strip()

    def generate(self, prompt: str) -> str:
        future = self._executor.submit(self._generate_sync, prompt)
        try:
            return future.result(timeout=self.settings.model_timeout_seconds)
        except concurrent.futures.TimeoutError:
            return "The model is taking too long to respond. Please try a shorter question."
