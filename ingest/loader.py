"""
loader.py - Load and normalize crawler output into unified document format.
"""
import json
import re
from pathlib import Path
from typing import Any


def _normalize_source_url(record: dict) -> str:
    """Extract clean source URL from record."""
    url = record.get("url") or record.get("source_url") or ""
    return str(url).strip()


def _normalize_title(record: dict) -> str:
    """Extract and clean title."""
    title = record.get("title") or record.get("name") or ""
    title = str(title).strip()
    
    # Remove common suffixes
    title = re.sub(r"\s*[-|]\s*Central University.*", "", title, flags=re.I)
    title = re.sub(r"\s*[-|]\s*CUK.*", "", title, flags=re.I)
    
    return title or "Untitled"


def _normalize_category(record: dict) -> str:
    """Extract category with fallback."""
    category = record.get("category") or "general"
    return str(category).lower().strip()


def _extract_links(record: dict) -> list[str]:
    """Extract all links from record."""
    links = []
    
    # Document links
    for link in record.get("document_links") or []:
        if link and isinstance(link, str):
            links.append(link.strip())
    
    # Outlinks
    for link in record.get("outlinks") or []:
        if link and isinstance(link, str):
            links.append(link.strip())
    
    # Notice links
    for notice in record.get("notices") or []:
        if isinstance(notice, dict) and notice.get("link"):
            links.append(str(notice["link"]).strip())
    
    return list(set(links))


def _extract_contacts(record: dict) -> list[dict]:
    """Extract contacts with deduplication."""
    contacts = []
    seen = set()
    
    for contact in record.get("contacts") or []:
        if not isinstance(contact, dict):
            continue
        
        contact_type = contact.get("type", "").lower()
        value = str(contact.get("value", "")).strip()
        
        if not value or not contact_type:
            continue
        
        key = (contact_type, value.lower())
        if key not in seen:
            seen.add(key)
            contacts.append({"type": contact_type, "value": value})
    
    return contacts


def _load_crawler_document(path: Path) -> dict | None:
    """Load a single crawler output JSON file."""
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    
    text = record.get("text") or ""
    if len(text.strip()) < 50:
        return None
    
    return {
        "doc_id": path.stem,
        "source_path": str(path.resolve()),
        "source_url": _normalize_source_url(record),
        "source_kind": "crawler",
        "title": _normalize_title(record),
        "category": _normalize_category(record),
        "file_type": record.get("type", "html"),
        "text": text,
        "has_table": bool(record.get("has_table") or record.get("tables")),
        "table_count": int(record.get("table_count") or len(record.get("tables") or [])),
        "table_row_count": int(record.get("table_row_count") or 0),
        "links": _extract_links(record),
        "contacts": _extract_contacts(record),
        "scraped_at": record.get("scraped_at"),
        "quality_score": int(record.get("quality_score") or 0),
        "ocr": bool(record.get("ocr", False)),
    }


def _load_manual_document(path: Path) -> dict | None:
    """Load a manual file (PDF, TXT, etc.)."""
    try:
        if path.suffix.lower() == ".txt":
            text = path.read_text(encoding="utf-8", errors="replace")
        elif path.suffix.lower() == ".json":
            data = json.loads(path.read_text(encoding="utf-8"))
            text = data.get("text") or data.get("content") or ""
        else:
            # For PDFs and other formats, assume they were processed by crawler
            return None
        
        if len(text.strip()) < 50:
            return None
        
        return {
            "doc_id": path.stem,
            "source_path": str(path.resolve()),
            "source_url": "",
            "source_kind": "manual",
            "title": path.stem.replace("_", " ").replace("-", " ").title(),
            "category": "general",
            "file_type": path.suffix.lstrip(".").lower(),
            "text": text,
            "has_table": False,
            "table_count": 0,
            "table_row_count": 0,
            "links": [],
            "contacts": [],
            "scraped_at": None,
            "quality_score": 0,
            "ocr": False,
        }
    except Exception:
        return None


def load_all(
    structured_dir: str | Path = "data/structured",
    manual_dir: str | Path = "data/manual",
) -> list[dict]:
    """
    Load all documents from crawler output and manual files.
    
    Returns:
        List of normalized document dictionaries.
    """
    documents = []
    
    # Load crawler output
    structured_path = Path(structured_dir)
    if structured_path.exists():
        for json_file in structured_path.glob("*.json"):
            doc = _load_crawler_document(json_file)
            if doc:
                documents.append(doc)
    
    # Load manual files
    manual_path = Path(manual_dir)
    if manual_path.exists():
        for file_path in manual_path.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in {".txt", ".json"}:
                doc = _load_manual_document(file_path)
                if doc:
                    documents.append(doc)
    
    return documents


if __name__ == "__main__":
    docs = load_all()
    print(f"Loaded {len(docs)} documents")
    
    if docs:
        print(f"\nSample document:")
        sample = docs[0]
        print(f"  ID: {sample['doc_id']}")
        print(f"  Title: {sample['title']}")
        print(f"  Category: {sample['category']}")
        print(f"  Type: {sample['file_type']}")
        print(f"  Text length: {len(sample['text'])} chars")
        print(f"  Has table: {sample['has_table']}")
        print(f"  Contacts: {len(sample['contacts'])}")
