"""Tests for the query rewrite pipeline and API endpoint response shapes."""
from __future__ import annotations

import types
import unittest

import pytest

from backend.query_rewrite import rewrite_query
from backend.rag import RetrievalOutput, RetrievedChunk


class TestRewriteQuery:
    """Tests for query_rewrite.rewrite_query."""

    def test_pronoun_resolution_from_history(self):
        history = [{"content": "Prof. Shabir Ahmad Ahanger is the coordinator of the department."}]
        rewritten = rewrite_query("what is his email?", history, enabled=True)
        assert "Shabir Ahmad Ahanger" in rewritten

    def test_no_pronouns_returns_unchanged(self):
        result = rewrite_query("admission deadlines 2026", [], enabled=True)
        assert result == "admission deadlines 2026"

    def test_disabled_returns_unchanged(self):
        history = [{"content": "Prof. Shabir Ahmad Ahanger is the coordinator."}]
        result = rewrite_query("what is his email?", history, enabled=False)
        assert result == "what is his email?"

    def test_empty_query_returns_empty(self):
        result = rewrite_query("", [], enabled=True)
        assert result == ""

    def test_whitespace_only_query(self):
        result = rewrite_query("   ", [], enabled=True)
        assert result == ""

    def test_no_history_returns_original(self):
        result = rewrite_query("what is his email?", [], enabled=True)
        # No entity to resolve — returns original
        assert result == "what is his email?"

    def test_her_pronoun_resolved(self):
        history = [{"content": "Prof. Fatima Khan is the coordinator."}]
        rewritten = rewrite_query("what is her phone?", history, enabled=True)
        assert "Fatima Khan" in rewritten

    def test_they_pronoun_resolved(self):
        history = [{"content": "Dr. Amir Hassan published the paper."}]
        rewritten = rewrite_query("where do they work?", history, enabled=True)
        assert "Amir Hassan" in rewritten

    def test_stop_words_not_used_as_entities(self):
        """Names matching stop-word patterns should be filtered."""
        history = [{"content": "Based On something else. Central University context."}]
        result = rewrite_query("what is his email?", history, enabled=True)
        # "Based On" is a 2-word stop phrase and should be filtered
        assert "Based On" not in result


class TestRetrievalOutputShape:
    """Verify dataclass shape and defaults."""

    def test_retrieval_output_construction(self):
        chunk = RetrievedChunk(
            text="sample",
            source_url="https://cukashmir.ac.in",
            page_title="Sample",
            date_scraped="2026-01-01",
            chunk_index=0,
            score=0.9,
        )
        output = RetrievalOutput(
            chunks=[chunk],
            confidence=0.85,
            mode="local",
            metadata={"candidate_count": 5},
        )
        assert len(output.chunks) == 1
        assert output.confidence == 0.85
        assert output.mode == "local"
        assert output.metadata["candidate_count"] == 5

    def test_empty_retrieval_output(self):
        output = RetrievalOutput(
            chunks=[],
            confidence=0.0,
            mode="supabase",
            metadata={},
        )
        assert len(output.chunks) == 0
        assert output.confidence == 0.0


class TestApiResponseShapes:
    """Tests for FastAPI endpoint response shapes using mocked state."""

    @pytest.mark.asyncio
    async def test_search_returns_retrieval_metadata(self):
        from backend.main import SearchRequest, app, search

        app.state.rag = types.SimpleNamespace(
            retrieve=lambda _query: RetrievalOutput(
                chunks=[],
                confidence=0.42,
                mode="supabase",
                metadata={
                    "candidate_count": 7,
                    "rerank_input_count": 4,
                    "selected_chunk_count": 2,
                    "timings_ms": {"total": 22},
                },
            )
        )
        payload = SearchRequest(query="test query")
        result = await search(payload)
        assert "retrieval" in result
        assert result["retrieval"]["candidate_count"] == 7

    @pytest.mark.asyncio
    async def test_chat_returns_required_fields(self):
        from starlette.requests import Request

        from backend.main import ChatRequest, app, chat
        from backend import main as main_mod

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
                metadata={
                    "candidate_count": 5,
                    "rerank_input_count": 3,
                    "selected_chunk_count": 1,
                    "timings_ms": {"total": 18},
                },
            )
        )
        app.state.prompt_builder = types.SimpleNamespace(
            build=lambda **_kwargs: types.SimpleNamespace(
                messages=[{"role": "user", "content": "x"}]
            )
        )
        app.state.model_status = "ready"
        main_mod.settings.demo_mode = True

        request = Request(
            {"type": "http", "method": "POST", "path": "/chat", "headers": []}
        )
        payload = ChatRequest(
            query="what is his email?",
            history=[
                {
                    "role": "assistant",
                    "content": "Prof. Shabir Ahmad Ahanger is coordinator",
                }
            ],
        )
        result = await chat(request, payload)
        assert "rewritten_query" in result
        assert "retrieval" in result
        assert "sources" in result
        assert "answer" in result
