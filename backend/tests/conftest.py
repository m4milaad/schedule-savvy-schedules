"""Shared pytest fixtures for backend tests."""
from __future__ import annotations

import types

import pytest

from backend.config import Settings


@pytest.fixture()
def default_settings() -> Settings:
    """
    Create a Settings instance configured with default test values.
    
    Returns:
        settings (Settings): A Settings object initialized with the module's default values for testing.
    """
    return Settings()


@pytest.fixture()
def heuristic_settings():
    """
    Provide a lightweight settings namespace tailored for heuristic tests.
    
    Returns:
        types.SimpleNamespace: A SimpleNamespace containing heuristic configuration values including weight_* heuristics, RRF and retrieval/rerank top-k limits, and a `sparse_enabled` boolean.
    """
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
    """
    Provide a small synthetic list of metadata records for use in tests.
    
    Each record is a dict representing scraped page metadata with the following keys:
    - source_url: original resource URL or file path (empty string to simulate an error page).
    - page_title: page title string.
    - text: extracted plain-text content.
    - has_table: `True` if the page contains at least one table, `False` otherwise.
    - table_row_count: number of rows in the first table (0 when none).
    - date_scraped: ISO date string when the page was scraped.
    - chunk_index: integer index for chunking/splitting content.
    
    Returns:
        list[dict]: A small hardcoded list of metadata dictionaries covering mixed cases
        (table and non-table pages, file URLs, and an error-like empty-URL entry).
    """
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
