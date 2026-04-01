from __future__ import annotations

import concurrent.futures
import threading
from dataclasses import dataclass
from typing import Literal

import httpx
import ollama

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
        self._ollama_client: ollama.Client | None = None
        self._ollama_available = False
        self._backend_in_use = "demo" if settings.demo_mode else "loading"
        self._status: ModelStatus = "demo_only" if settings.demo_mode else "loading"
        self._lock = threading.Lock()
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

    def _check_ollama(self) -> bool:
        try:
            with httpx.Client(timeout=2.5) as client:
                res = client.get(f"{self.settings.ollama_url}/api/tags")
                if res.status_code == 200:
                    return True
        except Exception:
            return False
        return False

    def _load_hf_pipeline(self, model_name: str):
        # Lazy import heavy ML dependencies so app startup can bind port quickly.
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, pipeline

        tokenizer = AutoTokenizer.from_pretrained(model_name)
        quant_config = None
        device_map = "cpu"
        torch_dtype = torch.float32

        if torch.cuda.is_available():
            device_map = "auto"
            torch_dtype = torch.float16
            try:
                quant_config = BitsAndBytesConfig(load_in_4bit=True)
            except Exception:
                quant_config = None

        kwargs = {"torch_dtype": torch_dtype}
        if quant_config is not None:
            kwargs["quantization_config"] = quant_config
        if device_map != "cpu":
            kwargs["device_map"] = device_map

        model = AutoModelForCausalLM.from_pretrained(model_name, **kwargs)
        return pipeline("text-generation", model=model, tokenizer=tokenizer)

    def load(self) -> None:
        if self.settings.demo_mode:
            return
        with self._lock:
            self._ollama_available = self._check_ollama()
            requested = self.settings.model_backend

            if self._ollama_available and requested in {"ollama", "tinyllama"}:
                self._ollama_client = ollama.Client(host=self.settings.ollama_url)
                self._backend_in_use = "ollama"
                self._status = "ready"
                return

            if requested == "phi3":
                try:
                    self._generator = self._load_hf_pipeline(self.settings.phi3_model)
                    self._backend_in_use = "phi3"
                    self._status = "ready"
                    return
                except Exception:
                    # Render safe fallback
                    self._generator = self._load_hf_pipeline(self.settings.tinyllama_model)
                    self._backend_in_use = "tinyllama"
                    self._status = "ready"
                    return

            # safe default
            self._generator = self._load_hf_pipeline(self.settings.tinyllama_model)
            self._backend_in_use = "tinyllama"
            self._status = "ready"

    @property
    def state(self) -> ModelState:
        return ModelState(
            backend=self._backend_in_use,
            status=self._status,
            loaded=self._status == "ready",
        )

    def _generate_sync(self, prompt: str) -> str:
        if self.settings.demo_mode:
            context_start = prompt.find("Context:")
            excerpt = prompt[context_start:context_start + 500] if context_start != -1 else prompt[:300]
            return f"[DEMO_MODE] Retrieved context summary:\n{excerpt}"

        if self._backend_in_use == "ollama":
            if self._ollama_client is None:
                self._ollama_client = ollama.Client(host=self.settings.ollama_url)
            result = self._ollama_client.generate(
                model="phi3:mini",
                prompt=prompt,
                options={"temperature": 0.1, "num_predict": self.settings.max_tokens},
            )
            return (result.get("response", "") or "").strip()

        if self._generator is None:
            return "[MODEL_LOADING] Model is still loading. Please retry in a moment."

        out = self._generator(
            prompt,
            max_new_tokens=self.settings.max_tokens,
            do_sample=False,
            temperature=0.1,
            return_full_text=False,
        )
        return (out[0].get("generated_text", "") or "").strip()

    def generate(self, prompt: str) -> str:
        future = self._executor.submit(self._generate_sync, prompt)
        try:
            return future.result(timeout=self.settings.model_timeout_seconds)
        except concurrent.futures.TimeoutError:
            return "The model is taking too long to respond. Please try a shorter question."
