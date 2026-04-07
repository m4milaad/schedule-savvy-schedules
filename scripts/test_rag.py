from __future__ import annotations

import json
from pathlib import Path

from backend.config import Settings
from backend.prompt import PromptBuilder
from backend.rag import RagPipeline


def main() -> None:
    settings = Settings()
    pipeline = RagPipeline(settings=settings)
    pipeline.load_index()
    prompt_builder = PromptBuilder(token_limit=1800)

    tests = [
        "What are the admission requirements for MBA?",
        "When is the last date to apply for PhD 2026?",
        "How can I contact the examination department?",
    ]

    out_dir = Path("data") / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []

    for query in tests:
        retrieval = pipeline.retrieve(query)
        payload = prompt_builder.build(query, retrieval.chunks)
        preview = json.dumps(payload.messages, ensure_ascii=False)[:700]
        results.append(
            {
                "query": query,
                "mode": retrieval.mode,
                "confidence": retrieval.confidence,
                "sources": [chunk.source_url for chunk in retrieval.chunks],
                "prompt_preview": preview,
            }
        )

    output = out_dir / "rag_test_results.json"
    output.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote RAG test results -> {output}")


if __name__ == "__main__":
    main()
