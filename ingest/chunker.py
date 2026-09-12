"""
chunker.py - Chunk documents into retrieval units.
"""
import hashlib
import re
from typing import Any


def _clean_chunk_text(text: str) -> str:
    """Clean chunk text."""
    text = re.sub(r"\s+", " ", text or "")
    text = text.strip()
    return text


def _semantic_split(text: str, max_chunk_size: int = 800) -> list[str]:
    """
    Split text into semantic chunks based on natural boundaries.
    
    Args:
        text: Input text
        max_chunk_size: Maximum chunk size in characters
    
    Returns:
        List of text chunks
    """
    if len(text) <= max_chunk_size:
        return [text]
    
    chunks = []
    
    # Split on double newlines first (paragraphs)
    paragraphs = re.split(r"\n\n+", text)
    
    current_chunk = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # If adding this paragraph would exceed limit
        if current_chunk and len(current_chunk) + len(para) + 2 > max_chunk_size:
            # Save current chunk
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            # Add to current chunk
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
    
    # Add final chunk
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # If we still have chunks that are too large, split on sentences
    final_chunks = []
    for chunk in chunks:
        if len(chunk) <= max_chunk_size:
            final_chunks.append(chunk)
        else:
            # Split on sentence boundaries
            sentences = re.split(r"(?<=[.!?])\s+", chunk)
            current = ""
            for sent in sentences:
                if current and len(current) + len(sent) + 1 > max_chunk_size:
                    final_chunks.append(current.strip())
                    current = sent
                else:
                    if current:
                        current += " " + sent
                    else:
                        current = sent
            if current:
                final_chunks.append(current.strip())
    
    return [c for c in final_chunks if c.strip()]


def _table_aware_split(text: str, has_table: bool, max_chunk_size: int = 800) -> list[str]:
    """
    Split text with table awareness.
    
    If document has tables, try to keep table rows together.
    """
    if not has_table:
        return _semantic_split(text, max_chunk_size)
    
    chunks = []
    
    # Split on table-like patterns (lines with | separators)
    lines = text.split("\n")
    current_chunk = ""
    in_table = False
    table_buffer = []
    
    for line in lines:
        is_table_line = line.count("|") >= 2
        
        if is_table_line:
            if not in_table:
                # Starting a table - save current chunk
                if current_chunk.strip():
                    chunks.extend(_semantic_split(current_chunk, max_chunk_size))
                    current_chunk = ""
                in_table = True
            table_buffer.append(line)
        else:
            if in_table:
                # Ending table - save table as chunk
                table_text = "\n".join(table_buffer)
                if len(table_text) > max_chunk_size * 1.5:
                    # Split large tables into groups of rows
                    for i in range(0, len(table_buffer), 20):
                        row_group = "\n".join(table_buffer[i:i+20])
                        if row_group.strip():
                            chunks.append(row_group.strip())
                else:
                    chunks.append(table_text)
                table_buffer = []
                in_table = False
            
            current_chunk += line + "\n"
    
    # Handle remaining content
    if table_buffer:
        chunks.append("\n".join(table_buffer))
    if current_chunk.strip():
        chunks.extend(_semantic_split(current_chunk, max_chunk_size))
    
    return [c for c in chunks if c.strip()]


def chunk(documents: list[dict], max_chunk_size: int = 800) -> list[dict]:
    """
    Chunk documents into retrieval units.
    
    Args:
        documents: List of document dictionaries
        max_chunk_size: Maximum chunk size in characters
    
    Returns:
        List of chunk dictionaries
    """
    all_chunks = []
    
    for doc in documents:
        text = doc.get("text", "")
        if not text or len(text.strip()) < 50:
            continue
        
        # Choose chunking strategy based on document properties
        has_table = doc.get("has_table", False)
        text_chunks = _table_aware_split(text, has_table, max_chunk_size)
        
        for idx, chunk_text in enumerate(text_chunks):
            chunk_text = _clean_chunk_text(chunk_text)
            if len(chunk_text) < 30:
                continue
            
            # Generate unique chunk ID
            chunk_id = hashlib.md5(
                f"{doc['doc_id']}_chunk_{idx}_{chunk_text[:100]}".encode("utf-8")
            ).hexdigest()[:16]
            
            chunk_obj = {
                "id": chunk_id,
                "doc_id": doc["doc_id"],
                "chunk_index": idx,
                "chunk_total": len(text_chunks),
                "text": chunk_text,
                "title": doc.get("title", ""),
                "source": doc.get("source_url") or doc.get("source_path", ""),
                "source_path": doc.get("source_path", ""),
                "source_url": doc.get("source_url", ""),
                "source_kind": doc.get("source_kind", "crawler"),
                "category": doc.get("category", "general"),
                "file_type": doc.get("file_type", "html"),
                "has_links": bool(doc.get("links")),
                "links": doc.get("links", [])[:15],
                "has_table": has_table,
                "table_row_count": doc.get("table_row_count", 0),
                "contact_field_count": len(doc.get("contacts", [])),
                "scraped_at": doc.get("scraped_at"),
                "quality_score": doc.get("quality_score", 0),
                "ocr": doc.get("ocr", False),
                "chunk_strategy": "table_aware" if has_table else "semantic",
                "semantic_kind": "table" if "|" in chunk_text and chunk_text.count("|") >= 4 else "paragraph",
            }
            
            all_chunks.append(chunk_obj)
    
    return all_chunks


if __name__ == "__main__":
    from ingest.loader import load_all
    
    docs = load_all()
    chunks = chunk(docs)
    
    print(f"Loaded {len(docs)} documents")
    print(f"Created {len(chunks)} chunks")
    
    if chunks:
        print(f"\nSample chunk:")
        sample = chunks[0]
        print(f"  ID: {sample['id']}")
        print(f"  Doc: {sample['doc_id']}")
        print(f"  Title: {sample['title']}")
        print(f"  Category: {sample['category']}")
        print(f"  Text: {sample['text'][:200]}...")
