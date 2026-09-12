"""
retriever.py - Hybrid retrieval with ChromaDB vector search and BM25.
"""
import json
import logging
from pathlib import Path
from typing import Any

import chromadb
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer


log = logging.getLogger(__name__)

# Global cache for models and collection
_embedder: SentenceTransformer | None = None
_collection: chromadb.Collection | None = None
_bm25: BM25Okapi | None = None
_corpus_texts: list[str] = []
_corpus_ids: list[str] = []


DEFAULT_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_COLLECTION = "university_kb"
DEFAULT_VECTOR_DB = "vector_db"
DEFAULT_RETRIEVAL_K = 20


def preload_embedder(model_name: str = DEFAULT_EMBED_MODEL) -> SentenceTransformer:
    """Preload and cache the embedding model."""
    global _embedder
    if _embedder is None:
        log.info(f"Loading embedder: {model_name}")
        _embedder = SentenceTransformer(model_name)
    return _embedder


def get_collection(
    collection_name: str = DEFAULT_COLLECTION,
    vector_db_dir: str = DEFAULT_VECTOR_DB,
    required: bool = True,
) -> chromadb.Collection | None:
    """Get or create ChromaDB collection."""
    global _collection
    
    if _collection is not None:
        return _collection
    
    try:
        client = chromadb.PersistentClient(path=vector_db_dir)
        _collection = client.get_collection(name=collection_name)
        log.info(f"Loaded collection: {collection_name} ({_collection.count()} chunks)")
        return _collection
    except Exception as exc:
        if required:
            raise RuntimeError(f"Failed to load collection '{collection_name}': {exc}") from exc
        log.warning(f"Collection not available: {exc}")
        return None


def collection_status(
    collection_name: str = DEFAULT_COLLECTION,
    vector_db_dir: str = DEFAULT_VECTOR_DB,
) -> dict:
    """Get collection status."""
    try:
        collection = get_collection(collection_name, vector_db_dir, required=False)
        if collection:
            return {
                "ready": True,
                "collection_name": collection_name,
                "count": collection.count(),
                "message": f"Collection '{collection_name}' is ready with {collection.count()} chunks",
            }
    except Exception as exc:
        pass
    
    return {
        "ready": False,
        "collection_name": collection_name,
        "count": 0,
        "message": f"Collection '{collection_name}' not found. Run: python -m ingest.build_db --reset",
    }


def _init_bm25(collection: chromadb.Collection) -> None:
    """Initialize BM25 index from collection."""
    global _bm25, _corpus_texts, _corpus_ids
    
    if _bm25 is not None:
        return
    
    log.info("Building BM25 index...")
    all_data = collection.get(include=["documents", "metadatas"])
    _corpus_texts = all_data["documents"]
    _corpus_ids = all_data["ids"]
    
    # Tokenize for BM25
    tokenized = [doc.lower().split() for doc in _corpus_texts]
    _bm25 = BM25Okapi(tokenized)
    log.info(f"BM25 index ready with {len(_corpus_texts)} documents")


def _vector_search(query: str, collection: chromadb.Collection, k: int = 20) -> list[dict]:
    """Perform vector similarity search."""
    embedder = preload_embedder()
    query_embedding = embedder.encode(query, normalize_embeddings=True).tolist()
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    
    chunks = []
    if results and results["ids"] and results["ids"][0]:
        for idx in range(len(results["ids"][0])):
            chunk = {
                "chunk_id": results["ids"][0][idx],
                "text": results["documents"][0][idx],
                "distance": results["distances"][0][idx],
                "matched_by": ["vector"],
            }
            # Add metadata
            if results["metadatas"] and results["metadatas"][0]:
                metadata = results["metadatas"][0][idx]
                chunk.update({
                    "title": metadata.get("title", ""),
                    "source_url": metadata.get("source_url", ""),
                    "source_path": metadata.get("source_path", ""),
                    "category": metadata.get("category", "general"),
                    "file_type": metadata.get("file_type", "html"),
                    "chunk_index": int(metadata.get("chunk_index", 0)),
                })
            chunks.append(chunk)
    
    return chunks


def _bm25_search(query: str, k: int = 20) -> list[dict]:
    """Perform BM25 lexical search."""
    if _bm25 is None or not _corpus_texts:
        return []
    
    tokenized_query = query.lower().split()
    scores = _bm25.get_scores(tokenized_query)
    
    # Get top k indices
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
    
    chunks = []
    for idx in top_indices:
        if scores[idx] > 0:
            chunks.append({
                "chunk_id": _corpus_ids[idx],
                "text": _corpus_texts[idx],
                "bm25_score": float(scores[idx]),
                "matched_by": ["bm25"],
            })
    
    return chunks


def hybrid_retrieve(
    query: str,
    k: int = DEFAULT_RETRIEVAL_K,
    collection_name: str = DEFAULT_COLLECTION,
    vector_db_dir: str = DEFAULT_VECTOR_DB,
) -> list[dict]:
    """
    Hybrid retrieval combining vector search and BM25.
    
    Args:
        query: Search query
        k: Number of results to return
        collection_name: ChromaDB collection name
        vector_db_dir: Vector database directory
    
    Returns:
        List of retrieved chunks with metadata
    """
    collection = get_collection(collection_name, vector_db_dir)
    if not collection:
        return []
    
    # Initialize BM25 if needed
    _init_bm25(collection)
    
    # Vector search
    vector_results = _vector_search(query, collection, k=k)
    
    # BM25 search
    bm25_results = _bm25_search(query, k=k)
    
    # Merge results
    merged = {}
    for chunk in vector_results + bm25_results:
        chunk_id = chunk["chunk_id"]
        if chunk_id in merged:
            # Combine match types
            existing_matches = set(merged[chunk_id].get("matched_by", []))
            new_matches = set(chunk.get("matched_by", []))
            merged[chunk_id]["matched_by"] = list(existing_matches | new_matches)
        else:
            merged[chunk_id] = chunk
    
    results = list(merged.values())
    
    # Sort by number of match types (hybrid), then by score
    def sort_key(chunk):
        match_count = len(chunk.get("matched_by", []))
        vector_score = 1.0 - chunk.get("distance", 1.0)  # Convert distance to similarity
        bm25_score = chunk.get("bm25_score", 0.0)
        return (match_count, vector_score + bm25_score * 0.1)
    
    results.sort(key=sort_key, reverse=True)
    return results[:k]


if __name__ == "__main__":
    # Test retrieval
    query = "What is the admission process at CUK?"
    results = hybrid_retrieve(query, k=5)
    
    print(f"Query: {query}")
    print(f"Results: {len(results)}\n")
    
    for idx, chunk in enumerate(results, 1):
        print(f"{idx}. {chunk.get('title', 'Untitled')}")
        print(f"   Category: {chunk.get('category', 'N/A')}")
        print(f"   Matched by: {', '.join(chunk.get('matched_by', []))}")
        print(f"   Text: {chunk.get('text', '')[:150]}...")
        print()
