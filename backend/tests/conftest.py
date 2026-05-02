"""Shared pytest fixtures for backend tests."""
from __future__ import annotations

import types

import pytest

from backend.config import Settings


@pytest.fixture()
def default_settings() -> Settings:
    """Return a Settings instance with defaults suitable for testing."""
    return Settings()


@pytest.fixture()
def heuristic_settings():
    """Lightweight namespace that replaces pipeline.settings for heuristic tests."""
    return types.SimpleNamespace(
        weight_heuristic_contact=0.90,
        weight_heuristic_table=0.60,
        weight_heuristic_entity=0.70,
        weight_heuristic_noise=0.50,
        rrf_k=60,
        weight_dense=0.35,
        weight_sparse=0.25,
        weight_rrf=0.20,
        weight_rerank=0.20,
        final_top_k=5,
        dense_top_k=20,
        sparse_top_k=20,
        sparse_enabled=True,
        rerank_candidate_k=10,
    )


@pytest.fixture()
def sample_metadata() -> list[dict]:
    """Small synthetic metadata corpus for testing."""
    return [
        {
            "source_url": "https://www.cukashmir.ac.in/departlist",
            "page_title": "Department List",
            "text": "Department of Computer Science. HOD: Prof. Ahmad. Email: ahmad@cukashmir.ac.in Phone: +91 9999999999",
            "has_table": False,
            "table_row_count": 0,
            "date_scraped": "2026-01-01",
            "chunk_index": 0,
        },
        {
            "source_url": "https://www.cukashmir.ac.in/admissions",
            "page_title": "Admissions 2026",
            "text": "Central University of Kashmir invites applications for B.Tech, M.Tech, MBA, and PhD programs. Last date: June 30, 2026.",
            "has_table": True,
            "table_row_count": 5,
            "date_scraped": "2026-01-01",
            "chunk_index": 0,
        },
        {
            "source_url": "file://notice_2026.pdf",
            "page_title": "General Notice",
            "text": "All students are hereby informed about the change in examination schedule.",
            "has_table": False,
            "table_row_count": 0,
            "date_scraped": "2026-01-01",
            "chunk_index": 0,
        },
        {
            "source_url": "https://www.ugc.gov.in/fake-universities",
            "page_title": "UGC Fake Universities",
            "text": "List of fake universities declared by University Grants Commission.",
            "has_table": True,
            "table_row_count": 20,
            "date_scraped": "2026-01-01",
            "chunk_index": 0,
        },
        {
            "source_url": "",
            "page_title": "Error Page",
            "text": "page not found 404 server error",
            "has_table": False,
            "table_row_count": 0,
            "date_scraped": "2026-01-01",
            "chunk_index": 0,
        },
    ]
