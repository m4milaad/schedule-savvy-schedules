"""
build_db.py - Build ChromaDB vector database from chunked documents.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).parent.parent))

from ingest.chunker import chunk
from ingest.loader import load_all


BATCH_SIZE = 256
DEFAULT_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_COLLECTION = "university_kb"
DEFAULT_VECTOR_DB = "vector_db"


def _metadata(chunk_item: dict) -> dict:
    """Convert chunk to ChromaDB metadata format."""
    return {
        "chunk_id": chunk_item["id"],
        "doc_id": chunk_item["doc_id"],
        "title": chunk_item["title"],
        "source": chunk_item["source"],
        "source_path": chunk_item["source_path"],
        "source_url": chunk_item.get("source_url") or "",
        "source_kind": chunk_item.get("source_kind", "crawler"),
        "category": chunk_item["category"],
        "file_type": chunk_item["file_type"],
        "chunk_index": str(chunk_item["chunk_index"]),
        "chunk_total": str(chunk_item["chunk_total"]),
        "chunk_strategy": chunk_item.get("chunk_strategy", "semantic"),
        "semantic_kind": chunk_item.get("semantic_kind", "paragraph"),
        "has_links": str(bool(chunk_item["has_links"])).lower(),
        "links": json.dumps(chunk_item["links"][:15]),
        "scraped_at": chunk_item.get("scraped_at") or "",
        "ocr": str(bool(chunk_item.get("ocr", False))).lower(),
        "has_table": str(bool(chunk_item.get("has_table", False))).lower(),
        "table_row_count": str(int(chunk_item.get("table_row_count", 0))),
        "contact_field_count": str(int(chunk_item.get("contact_field_count", 0))),
    }


def build(
    reset: bool = False,
    embed_model: str = DEFAULT_EMBED_MODEL,
    collection_name: str = DEFAULT_COLLECTION,
    vector_db_dir: str = DEFAULT_VECTOR_DB,
) -> int:
    """
    Build or update the ChromaDB vector database.
    
    Args:
        reset: If True, clear existing chunks before building
        embed_model: Sentence transformer model name
        collection_name: ChromaDB collection name
        vector_db_dir: Path to vector database directory
    
    Returns:
        Exit code (0 = success)
    """
    print("Loading documents...")
    documents = load_all()
    chunks = chunk(documents)
    
    if not chunks:
        print("No chunks found. Add crawler output under data/structured or manual files under data/manual.")
        return 1

    print(f"  {len(documents)} docs -> {len(chunks)} chunks")
    print(f"  Source kinds: {dict(sorted(Counter(doc['source_kind'] for doc in documents).items()))}")
    print(f"  File types: {dict(sorted(Counter(doc['file_type'] for doc in documents).items()))}")
    print(f"  Categories: {dict(sorted(Counter(chunk['category'] for chunk in chunks).most_common(10)))}")
    
    print(f"\nEmbedding with model: {embed_model}")
    try:
        model = SentenceTransformer(embed_model)
    except Exception as exc:
        print(f"Failed to load embedding model: {exc}")
        print("Make sure sentence-transformers is installed: pip install sentence-transformers")
        return 1
    
    texts = [item["text"] for item in chunks]
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        batch_size=64,
        normalize_embeddings=True,
    ).tolist()

    print(f"\nStoring in ChromaDB at: {vector_db_dir}")
    client = chromadb.PersistentClient(path=vector_db_dir)
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    if reset:
        existing_ids = collection.get().get("ids", [])
        if existing_ids:
            collection.delete(ids=existing_ids)
            print(f"  Cleared {len(existing_ids)} existing chunks")

    for start in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[start : start + BATCH_SIZE]
        batch_slice = slice(start, start + len(batch))
        collection.upsert(
            documents=texts[batch_slice],
            embeddings=embeddings[batch_slice],
            ids=[item["id"] for item in batch],
            metadatas=[_metadata(item) for item in batch],
        )
        print(f"  Upserted batch {start // BATCH_SIZE + 1} ({start + len(batch)}/{len(chunks)})")

    print(f"\n✓ Done! Collection '{collection_name}' now contains {collection.count()} chunks.")
    return 0


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Build or refresh the Chroma vector database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing chunks before rebuilding the collection.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_EMBED_MODEL,
        help=f"Embedding model (default: {DEFAULT_EMBED_MODEL})",
    )
    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help=f"Collection name (default: {DEFAULT_COLLECTION})",
    )
    parser.add_argument(
        "--db-dir",
        default=DEFAULT_VECTOR_DB,
        help=f"Vector DB directory (default: {DEFAULT_VECTOR_DB})",
    )
    
    args = parser.parse_args()
    return build(
        reset=args.reset,
        embed_model=args.model,
        collection_name=args.collection,
        vector_db_dir=args.db_dir,
    )


if __name__ == "__main__":
    raise SystemExit(main())
