from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW_JSON = ROOT / "data" / "raw" / "exa_crawl.json"
OUT_JSONL = ROOT / "data" / "processed" / "documents.jsonl"


def chunk_text(text: str, max_chars: int = 900) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    chunks: list[str] = []
    cursor = 0
    while cursor < len(clean):
        window = clean[cursor : cursor + max_chars]
        split_at = window.rfind(". ")
        end = cursor + split_at + 1 if split_at > 250 else cursor + max_chars
        chunks.append(clean[cursor:end].strip())
        cursor = end
    return [chunk for chunk in chunks if len(chunk) >= 140]


def main() -> None:
    if not RAW_JSON.exists():
        raise FileNotFoundError(f"Raw crawl file not found: {RAW_JSON}")

    payload = json.loads(RAW_JSON.read_text(encoding="utf-8"))
    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)

    count = 0
    with OUT_JSONL.open("w", encoding="utf-8") as handle:
        for idx, row in enumerate(payload, start=1):
            for chunk_idx, chunk in enumerate(chunk_text(row["content"]), start=1):
                item = {
                    "id": f"exa_{idx}_{chunk_idx}",
                    "title": row["title"],
                    "url": row["url"],
                    "source": row.get("name", "Exa Crawl"),
                    "category": row.get("category", "General"),
                    "content": chunk,
                }
                handle.write(json.dumps(item, ensure_ascii=False) + "\n")
                count += 1
    print(f"Wrote {count} chunked docs to {OUT_JSONL}")


if __name__ == "__main__":
    main()
