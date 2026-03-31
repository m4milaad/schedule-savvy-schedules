from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KB_JSON = ROOT / "public" / "chatbot" / "knowledge-base.json"
OUT_JSONL = ROOT / "data" / "processed" / "documents.jsonl"


def main() -> None:
    if not KB_JSON.exists():
        raise FileNotFoundError(f"Knowledge base file not found: {KB_JSON}")

    payload = json.loads(KB_JSON.read_text(encoding="utf-8"))
    documents = payload.get("documents", [])
    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)

    with OUT_JSONL.open("w", encoding="utf-8") as handle:
        for doc in documents:
            row = {
                "id": doc["id"],
                "title": doc["title"],
                "url": doc["sourceUrl"],
                "source": doc.get("sourceName", "CUK Knowledge Base"),
                "category": doc.get("category", "General"),
                "content": doc["content"],
            }
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Wrote {len(documents)} documents to {OUT_JSONL}")


if __name__ == "__main__":
    main()
