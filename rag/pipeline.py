"""
pipeline.py - End-to-end RAG pipeline orchestration.
"""
import logging
import os
import time
from typing import Any, Generator

import requests
from dotenv import load_dotenv

from rag.memory import rewrite_query
from rag.prompt import build_prompt
from rag.reranker import preload_reranker, rerank
from rag.retriever import collection_status, get_collection, hybrid_retrieve, preload_embedder


# Load environment variables
load_dotenv()

log = logging.getLogger(__name__)

# Configuration from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GENERATOR_MODEL = os.getenv("GENERATOR_MODEL", "llama-3.1-8b-instant")
FALLBACK_MODEL = os.getenv("FALLBACK_GENERATOR_MODEL", "llama3-8b-8192")

RAG_RETRIEVAL_K = int(os.getenv("RAG_RETRIEVAL_K", "20"))
RAG_RERANK_TOP_K = int(os.getenv("RAG_RERANK_TOP_K", "5"))


class GeneratorConnectionError(Exception):
    """Error during LLM generation."""
    pass


def warmup_local_models() -> None:
    """Preload models for faster first response."""
    try:
        get_collection(required=False)
    except Exception as exc:
        log.warning("Collection warmup skipped: %s", exc)

    for loader, label in ((preload_embedder, "embedder"), (preload_reranker, "reranker")):
        try:
            loader()
            log.info("Warmup complete: %s", label)
        except Exception as exc:
            log.warning("Warmup failed for %s: %s", label, exc)


def generate_text(prompt: str, stream: bool = False) -> str:
    """
    Generate text using Groq API.
    
    Args:
        prompt: Input prompt
        stream: Whether to stream response
    
    Returns:
        Generated text
    """
    if not GROQ_API_KEY:
        raise GeneratorConnectionError("GROQ_API_KEY not set in environment")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": GENERATOR_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 1024,
        "stream": stream,
    }
    
    try:
        response = requests.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    
    except requests.exceptions.RequestException as exc:
        log.error(f"Groq API error: {exc}")
        raise GeneratorConnectionError(f"Failed to generate response: {exc}") from exc


def app_status() -> dict:
    """Get application status."""
    kb = collection_status()
    return {
        "generator_configured": bool(GROQ_API_KEY),
        "generator_model": GENERATOR_MODEL,
        "knowledge_base_ready": kb["ready"],
        "collection_name": kb["collection_name"],
        "chunk_count": kb["count"],
        "message": kb["message"],
    }


def run_with_metadata(
    query: str,
    history: list[dict],
    *,
    answer_style: str = "balanced",
) -> tuple[str, list[dict], dict]:
    """
    Run complete RAG pipeline with metadata tracking.
    
    Args:
        query: User query
        history: Conversation history
        answer_style: Answer style (balanced, detailed, concise)
    
    Returns:
        Tuple of (answer, sources, metadata)
    """
    clean_query = (query or "").strip()
    metadata = {
        "query": clean_query,
        "rewritten_query": clean_query,
        "candidate_count": 0,
        "rerank_input_count": 0,
        "selected_chunk_count": 0,
        "timings_ms": {},
    }
    
    if not clean_query:
        return "Please ask a question about the university.", [], metadata
    
    # Check for greetings
    if clean_query.lower() in {"hi", "hello", "hey"}:
        return "Hello! I'm NeMoX, your CUK AI assistant. Ask me about admissions, faculty, departments, courses, or university information.", [], metadata
    
    started = time.perf_counter()
    
    # Rewrite query based on history
    smart_query = rewrite_query(clean_query, history)
    metadata["rewritten_query"] = smart_query
    log.info("Smart query: %s", smart_query)
    after_rewrite = time.perf_counter()
    
    # Retrieve candidates
    candidates = hybrid_retrieve(smart_query, k=RAG_RETRIEVAL_K)
    metadata["candidate_count"] = len(candidates)
    log.info("Retrieved %s candidates", len(candidates))
    after_retrieve = time.perf_counter()
    
    if not candidates:
        metadata["timings_ms"] = {
            "rewrite": round((after_rewrite - started) * 1000, 1),
            "retrieve": round((after_retrieve - after_rewrite) * 1000, 1),
            "total": round((after_retrieve - started) * 1000, 1),
        }
        return "I don't have that information. Please contact the university office directly.", [], metadata
    
    # Rerank
    top_chunks = rerank(smart_query, candidates, top_k=RAG_RERANK_TOP_K)
    metadata["selected_chunk_count"] = len(top_chunks)
    after_rerank = time.perf_counter()
    
    # Build sources
    sources = []
    for idx, chunk in enumerate(top_chunks, 1):
        sources.append({
            "citation": idx,
            "label": chunk.get("title", "Source"),
            "url": chunk.get("source_url"),
            "path": chunk.get("source_path"),
            "category": chunk.get("category", "general"),
            "preview": chunk.get("text", "")[:200],
            "matched_by": chunk.get("matched_by", []),
            "rerank_score": chunk.get("rerank_score"),
        })
    
    # Build prompt
    prompt = build_prompt(smart_query, top_chunks, history, answer_style=answer_style)
    after_prompt = time.perf_counter()
    
    # Generate answer
    try:
        log.info("Generating with model: %s", GENERATOR_MODEL)
        answer = generate_text(prompt, stream=False)
    except GeneratorConnectionError as exc:
        log.warning("Generation failed: %s", exc)
        answer = "I encountered an error generating a response. Please try again."
    
    after_generate = time.perf_counter()
    
    metadata["timings_ms"] = {
        "rewrite": round((after_rewrite - started) * 1000, 1),
        "retrieve": round((after_retrieve - after_rewrite) * 1000, 1),
        "rerank": round((after_rerank - after_retrieve) * 1000, 1),
        "prompt": round((after_prompt - after_rerank) * 1000, 1),
        "generate": round((after_generate - after_prompt) * 1000, 1),
        "total": round((after_generate - started) * 1000, 1),
    }
    
    log.info(
        "Pipeline timings | rewrite=%.3fs retrieve=%.3fs rerank=%.3fs prompt=%.3fs generate=%.3fs total=%.3fs",
        after_rewrite - started,
        after_retrieve - after_rewrite,
        after_rerank - after_retrieve,
        after_prompt - after_rerank,
        after_generate - after_prompt,
        after_generate - started,
    )
    
    return answer, sources, metadata


def run(
    query: str,
    history: list[dict],
    *,
    answer_style: str = "balanced",
) -> tuple[str, list[dict]]:
    """
    Run RAG pipeline (simplified interface).
    
    Args:
        query: User query
        history: Conversation history
        answer_style: Answer style
    
    Returns:
        Tuple of (answer, sources)
    """
    answer, sources, _ = run_with_metadata(query, history, answer_style=answer_style)
    return answer, sources


if __name__ == "__main__":
    import sys
    
    query = " ".join(sys.argv[1:]).strip()
    if not query:
        query = input("Question: ").strip()
    query = query or "What is the admission process at CUK?"
    
    print(f"\nQuery: {query}\n")
    
    answer, sources = run(query, [])
    
    print("Answer:")
    print(answer)
    
    if sources:
        print("\n\nSources:")
        for source in sources:
            label = source.get("label") or "Untitled source"
            citation = source.get("citation", "?")
            location = source.get("url") or source.get("path") or ""
            print(f"[{citation}] {label}")
            if location:
                print(f"    {location}")
