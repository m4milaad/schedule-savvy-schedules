"""
reranker.py - Cross-encoder reranking for retrieved chunks.
"""
import logging
from typing import Any

from sentence_transformers import CrossEncoder


log = logging.getLogger(__name__)

_reranker: CrossEncoder | None = None

DEFAULT_RERANK_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
DEFAULT_TOP_K = 5


def preload_reranker(model_name: str = DEFAULT_RERANK_MODEL) -> CrossEncoder:
    """Preload and cache the reranker model."""
    global _reranker
    if _reranker is None:
        log.info(f"Loading reranker: {model_name}")
        _reranker = CrossEncoder(model_name)
    return _reranker


def rerank(
    query: str,
    chunks: list[dict],
    top_k: int = DEFAULT_TOP_K,
    model_name: str = DEFAULT_RERANK_MODEL,
) -> list[dict]:
    """
    Rerank chunks using cross-encoder model.
    
    Args:
        query: Search query
        chunks: List of retrieved chunks
        top_k: Number of top chunks to return
        model_name: Cross-encoder model name
    
    Returns:
        Reranked list of chunks with rerank_score
    """
    if not chunks:
        return []
    
    # Preload model
    reranker = preload_reranker(model_name)
    
    # Prepare pairs for cross-encoder
    pairs = [[query, chunk.get("text", "")] for chunk in chunks]
    
    # Get rerank scores
    scores = reranker.predict(pairs)
    
    # Add scores to chunks
    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)
    
    # Sort by rerank score
    chunks.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)
    
    # Return top k
    return chunks[:top_k]


if __name__ == "__main__":
    # Test reranking
    query = "admission process"
    
    test_chunks = [
        {"text": "The admission process requires CUET scores and online application.", "title": "Admissions"},
        {"text": "CUK offers various undergraduate and postgraduate programmes.", "title": "Programmes"},
        {"text": "To apply for admission, visit the official portal.", "title": "How to Apply"},
    ]
    
    reranked = rerank(query, test_chunks, top_k=3)
    
    print(f"Query: {query}\n")
    for idx, chunk in enumerate(reranked, 1):
        print(f"{idx}. Score: {chunk['rerank_score']:.3f}")
        print(f"   Title: {chunk.get('title', 'N/A')}")
        print(f"   Text: {chunk['text'][:100]}...")
        print()
