"""Tests for RagPipeline scoring, ranking, and retrieval helpers."""
from __future__ import annotations

import types

import pytest

from backend.config import Settings
from backend.rag import RagPipeline, ScoredCandidate


class TestHeuristicScore:
    """Tests for RagPipeline._heuristic_score."""

    def _make_pipeline(self, heuristic_settings) -> RagPipeline:
        """
        Create a RagPipeline instance and replace its settings with the provided heuristic settings.
        
        Parameters:
            heuristic_settings (Settings): Settings object containing heuristic configuration to apply to the pipeline.
        
        Returns:
            RagPipeline: A pipeline configured with the supplied heuristic settings.
        """
        pipeline = RagPipeline(settings=Settings())
        pipeline.settings = heuristic_settings
        return pipeline

    def test_contact_intent_with_email_in_text(self, heuristic_settings):
        pipeline = self._make_pipeline(heuristic_settings)
        row = {
            "source_url": "https://www.cukashmir.ac.in/contact",
            "page_title": "Department Contact",
            "text": "Email: prof@cukashmir.ac.in Phone: +91 9999999999",
            "has_table": False,
            "table_row_count": 0,
        }
        score = pipeline._heuristic_score("contact email for department", row)
        assert score > 0.0

    def test_contact_intent_without_signals_gets_low_score(self, heuristic_settings):
        pipeline = self._make_pipeline(heuristic_settings)
        row = {
            "source_url": "https://www.cukashmir.ac.in/about",
            "page_title": "About Us",
            "text": "General information about the university.",
            "has_table": False,
            "table_row_count": 0,
        }
        score_contact = pipeline._heuristic_score("contact email", row)
        # Should be lower than a page with actual contact data
        row_with_contact = {
            "source_url": "https://www.cukashmir.ac.in/contact",
            "page_title": "Department Contact",
            "text": "Email: prof@cukashmir.ac.in",
            "has_table": False,
            "table_row_count": 0,
        }
        score_with = pipeline._heuristic_score("contact email", row_with_contact)
        assert score_with > score_contact

    def test_table_intent_boosts_table_rows(self, heuristic_settings):
        pipeline = self._make_pipeline(heuristic_settings)
        row_with_table = {
            "source_url": "https://cukashmir.ac.in/data",
            "page_title": "Data",
            "text": "list of total eligible students",
            "has_table": True,
            "table_row_count": 10,
        }
        row_without_table = {
            "source_url": "https://cukashmir.ac.in/data",
            "page_title": "Data",
            "text": "list of total eligible students",
            "has_table": False,
            "table_row_count": 0,
        }
        score_with = pipeline._heuristic_score("total number of eligible", row_with_table)
        score_without = pipeline._heuristic_score("total number of eligible", row_without_table)
        assert score_with > score_without

    def test_noise_penalty_for_404_pages(self, heuristic_settings):
        pipeline = self._make_pipeline(heuristic_settings)
        row = {
            "source_url": "",
            "page_title": "Error",
            "text": "page not found 404 server error",
            "has_table": False,
            "table_row_count": 0,
        }
        score = pipeline._heuristic_score("admissions", row)
        assert score < 0.0

    def test_file_source_penalized_for_contact_intent(self, heuristic_settings):
        pipeline = self._make_pipeline(heuristic_settings)
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
        assert web_score > file_score


class TestIsContactIntent:
    """Tests for RagPipeline._is_contact_intent."""

    def test_contact_keywords(self):
        assert RagPipeline._is_contact_intent("what is the email")
        assert RagPipeline._is_contact_intent("department of CS")
        assert RagPipeline._is_contact_intent("faculty list")
        assert RagPipeline._is_contact_intent("HOD phone number")

    def test_non_contact_queries(self):
        assert not RagPipeline._is_contact_intent("admission dates")
        assert not RagPipeline._is_contact_intent("exam schedule")


class TestIsAllowedSourceUrl:
    """Tests for RagPipeline._is_allowed_source_url."""

    def test_empty_url_allowed(self):
        assert RagPipeline._is_allowed_source_url("") is True

    def test_cuk_url_allowed(self):
        assert RagPipeline._is_allowed_source_url("https://www.cukashmir.ac.in/page")

    def test_ugc_url_allowed(self):
        assert RagPipeline._is_allowed_source_url("https://www.ugc.gov.in/fake")

    def test_file_url_allowed(self):
        assert RagPipeline._is_allowed_source_url("file://document.pdf")

    def test_random_domain_blocked(self):
        assert not RagPipeline._is_allowed_source_url("https://www.example.com/page")

    def test_ac_in_domain_allowed(self):
        assert RagPipeline._is_allowed_source_url("https://www.some-college.ac.in/page")


class TestSanitizeSourceUrl:
    """Tests for RagPipeline._sanitize_source_url."""

    def test_empty_url(self):
        assert RagPipeline._sanitize_source_url("", "Title") == ""

    def test_cuk_url_passthrough(self):
        url = "https://www.cukashmir.ac.in/departments"
        assert RagPipeline._sanitize_source_url(url, "Departments") == url

    def test_non_cuk_with_pdf_title_becomes_file_url(self):
        result = RagPipeline._sanitize_source_url(
            "https://random-cdn.com/doc.pdf",
            "cukapi disgenweb in p notice_2026.pdf",
        )
        assert result.startswith("file://")


class TestRRFFuse:
    """Tests for RagPipeline._rrf_fuse."""

    def _make_pipeline(self, heuristic_settings) -> RagPipeline:
        """
        Create a RagPipeline instance and replace its settings with the provided heuristic settings.
        
        Parameters:
            heuristic_settings (Settings): Settings object containing heuristic configuration to apply to the pipeline.
        
        Returns:
            RagPipeline: A pipeline configured with the supplied heuristic settings.
        """
        pipeline = RagPipeline(settings=Settings())
        pipeline.settings = heuristic_settings
        return pipeline

    def test_dense_only_candidates(self, heuristic_settings, sample_metadata):
        pipeline = self._make_pipeline(heuristic_settings)
        dense = [(0, 0.5, 0.75), (1, 0.8, 0.60)]
        sparse: list[tuple[int, float]] = []
        fused = pipeline._rrf_fuse(dense, sparse, sample_metadata, "test query")
        assert len(fused) == 2
        assert all(isinstance(c, ScoredCandidate) for c in fused)
        assert all("dense" in c.matched_by for c in fused)

    def test_sparse_only_candidates(self, heuristic_settings, sample_metadata):
        pipeline = self._make_pipeline(heuristic_settings)
        dense: list[tuple[int, float, float]] = []
        sparse = [(0, 0.9), (2, 0.5)]
        fused = pipeline._rrf_fuse(dense, sparse, sample_metadata, "test query")
        assert len(fused) == 2
        assert all("sparse" in c.matched_by for c in fused)

    def test_both_dense_and_sparse(self, heuristic_settings, sample_metadata):
        pipeline = self._make_pipeline(heuristic_settings)
        dense = [(0, 0.5, 0.75)]
        sparse = [(0, 0.9), (1, 0.5)]
        fused = pipeline._rrf_fuse(dense, sparse, sample_metadata, "test query")
        # idx 0 should appear once with both sources
        idx_0 = [c for c in fused if c.idx == 0]
        assert len(idx_0) == 1
        assert "dense" in idx_0[0].matched_by
        assert "sparse" in idx_0[0].matched_by
        # idx 0 should have higher RRF score than idx 1 (appeared in both lists)
        idx_1 = [c for c in fused if c.idx == 1]
        assert idx_0[0].rrf_score > idx_1[0].rrf_score

    def test_rrf_score_calculation(self, heuristic_settings, sample_metadata):
        pipeline = self._make_pipeline(heuristic_settings)
        k = heuristic_settings.rrf_k
        dense = [(0, 0.5, 0.75)]  # rank 1
        sparse: list[tuple[int, float]] = []
        fused = pipeline._rrf_fuse(dense, sparse, sample_metadata, "query")
        expected_rrf = 1.0 / (k + 1)
        assert abs(fused[0].rrf_score - expected_rrf) < 1e-6


class TestEntityOverlap:
    """Tests for _entity_overlap_score."""

    def test_full_overlap(self):
        pipeline = RagPipeline(settings=Settings())
        score = pipeline._entity_overlap_score(
            query="computer science",
            source_url="",
            page_title="Computer Science Department",
            text="Welcome to computer science.",
        )
        assert score > 0.0

    def test_no_overlap(self):
        pipeline = RagPipeline(settings=Settings())
        score = pipeline._entity_overlap_score(
            query="biotechnology",
            source_url="",
            page_title="Mathematics Department",
            text="Welcome to mathematics.",
        )
        assert score == 0.0

    def test_stopwords_excluded(self):
        pipeline = RagPipeline(settings=Settings())
        # "the" and "is" are stop words and shouldn't count
        score = pipeline._entity_overlap_score(
            query="the is",
            source_url="",
            page_title="Something",
            text="Some unrelated text.",
        )
        assert score == 0.0
