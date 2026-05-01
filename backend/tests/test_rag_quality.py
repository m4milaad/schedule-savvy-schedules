from __future__ import annotations

import types
import unittest

from backend.config import Settings
from backend.main import ChatRequest, SearchRequest, app, chat, search
from backend.query_rewrite import rewrite_query
from backend.rag import RagPipeline, RetrievalOutput, RetrievedChunk
from starlette.requests import Request


class QueryRewriteTests(unittest.TestCase):
    def test_rewrite_query_resolves_pronouns_from_history(self):
        history = [{"content": "Prof. Shabir Ahmad Ahanger is the coordinator of the department."}]
        rewritten = rewrite_query("what is his email?", history, enabled=True)
        self.assertIn("Shabir Ahmad Ahanger's", rewritten)


class RankingBehaviorTests(unittest.TestCase):
    def test_contact_chunk_gets_higher_heuristic_score(self):
        pipeline = RagPipeline(settings=Settings())
        # Replace settings with a minimal namespace so the test is deterministic.
        pipeline.settings = types.SimpleNamespace(
            weight_heuristic_contact=0.90,
            weight_heuristic_table=0.60,
            weight_heuristic_entity=0.70,
            weight_heuristic_noise=0.50,
            rrf_k=60,
        )
        contact_row = {
            "source_url": "https://www.cukashmir.ac.in/contact",
            "page_title": "Department Contact",
            "text": "Name: Prof. Shabir Ahmad Ahanger Email: shabir@cukashmir.ac.in Phone: +91 9999999999",
            "has_table": False,
            "table_row_count": 0,
        }
        generic_row = {
            "source_url": "https://www.cukashmir.ac.in/policy",
            "page_title": "Policy",
            "text": "General policy document with no contact details.",
            "has_table": False,
            "table_row_count": 0,
        }
        contact_score = pipeline._heuristic_score("what is professor shabir contact email", contact_row)
        generic_score = pipeline._heuristic_score("what is professor shabir contact email", generic_row)
        self.assertGreater(contact_score, generic_score)

    def test_file_source_penalized_for_contact_intent_without_signals(self):
        pipeline = RagPipeline(settings=Settings())
        pipeline.settings = types.SimpleNamespace(
            weight_heuristic_contact=0.90,
            weight_heuristic_table=0.60,
            weight_heuristic_entity=0.70,
            weight_heuristic_noise=0.50,
            rrf_k=60,
        )
        web_row = {
            "source_url": "https://www.cukashmir.ac.in/contact",
            "page_title": "Contact Page",
            "text": "Official contact directory for departments.",
            "has_table": False,
            "table_row_count": 0,
        }
        file_row = {
            "source_url": "file://random_notice.pdf",
            "page_title": "Notice",
            "text": "General notice without email and phone data.",
            "has_table": False,
            "table_row_count": 0,
        }
        web_score = pipeline._heuristic_score("contact email for department", web_row)
        file_score = pipeline._heuristic_score("contact email for department", file_row)
        self.assertGreater(web_score, file_score)


class ApiMetadataTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_returns_retrieval_metadata(self):
        app.state.rag = types.SimpleNamespace(
            retrieve=lambda _query: RetrievalOutput(
                chunks=[],
                confidence=0.42,
                mode="supabase",
                metadata={"candidate_count": 7, "rerank_input_count": 4, "selected_chunk_count": 2, "timings_ms": {"total": 22}},
            )
        )
        payload = SearchRequest(query="test query")
        result = await search(payload)
        self.assertIn("retrieval", result)
        self.assertEqual(result["retrieval"]["candidate_count"], 7)

    async def test_chat_returns_rewritten_query_and_metrics(self):
        chunk = RetrievedChunk(
            text="sample",
            source_url="https://www.cukashmir.ac.in",
            page_title="Sample",
            date_scraped="2026-01-01",
            chunk_index=0,
            score=0.9,
        )
        app.state.rag = types.SimpleNamespace(
            retrieve=lambda _query: RetrievalOutput(
                chunks=[chunk],
                confidence=0.9,
                mode="supabase",
                metadata={"candidate_count": 5, "rerank_input_count": 3, "selected_chunk_count": 1, "timings_ms": {"total": 18}},
            )
        )
        app.state.prompt_builder = types.SimpleNamespace(build=lambda **_kwargs: types.SimpleNamespace(messages=[{"role": "user", "content": "x"}]))
        app.state.model_status = "ready"
        from backend import main as main_mod

        main_mod.settings.demo_mode = True
        request = Request({"type": "http", "method": "POST", "path": "/chat", "headers": []})
        payload = ChatRequest(query="what is his email?", history=[{"role": "assistant", "content": "Prof. Shabir Ahmad Ahanger is coordinator"}])
        result = await chat(request, payload)
        self.assertIn("rewritten_query", result)
        self.assertIn("retrieval", result)
        self.assertIn("sources", result)


if __name__ == "__main__":
    unittest.main()
