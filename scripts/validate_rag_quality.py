from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("RAG_STORE", "faiss")

from backend.config import Settings
from backend.query_rewrite import rewrite_query
from backend.rag import RagPipeline

OUT_PATH = ROOT / "data" / "processed" / "rag_quality_eval.json"
GOLDEN_QUERIES = [
    "what is the contact email for biotechnology department",
    "who is the hod of media studies and what is his phone number",
    "how many faculty members are in school of legal studies",
    "what are form numbers of selected phd media studies candidates",
    "when is admission process for 2026 and where to apply",
]


def main() -> None:
    settings = Settings()
    rag = RagPipeline(settings=settings)
    rag.load_index()

    rows: list[dict] = []
    for query in GOLDEN_QUERIES:
        rewritten = rewrite_query(query, [], enabled=settings.query_rewrite_enabled)
        out = rag.retrieve(rewritten)
        rows.append(
            {
                "query": query,
                "rewritten_query": rewritten,
                "mode": out.mode,
                "confidence": round(out.confidence, 4),
                "retrieval": out.metadata,
                "top_sources": [c.source_url for c in out.chunks[:3]],
            }
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved validation report to {OUT_PATH}")


if __name__ == "__main__":
    main()
