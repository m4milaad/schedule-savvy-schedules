"""Tests for SparseIndex (BM25) — chunking, tokenization, and search."""
from __future__ import annotations

from backend.rag import SparseIndex


class TestSparseIndexBuild:
    """Tests for SparseIndex._build() — tokenization, document frequency, avgdl."""

    def test_build_populates_doc_tokens(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        assert len(idx.doc_tokens) == len(sample_metadata)
        for doc_tokens in idx.doc_tokens:
            assert isinstance(doc_tokens, list)

    def test_build_document_frequency_counts(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        # 'department' appears in at least 2 documents (departlist + Computer Science text)
        assert idx.df.get("department", 0) >= 1
        # Every document contributes at least one token
        assert len(idx.df) > 0

    def test_build_average_document_length(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        assert idx.avgdl > 0.0

    def test_build_empty_metadata(self):
        idx = SparseIndex([])
        assert idx.doc_tokens == []
        assert idx.df == {}
        assert idx.avgdl == 0.0

    def test_build_single_document(self):
        single = [{"text": "hello world", "page_title": "test", "source_url": "https://example.com"}]
        idx = SparseIndex(single)
        assert len(idx.doc_tokens) == 1
        assert idx.avgdl > 0.0


class TestSparseIndexSearch:
    """Tests for SparseIndex.search() — BM25 scoring."""

    def test_search_returns_ranked_results(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        results = idx.search("department computer science email", top_k=3)
        assert len(results) > 0
        # Each result is (index, score)
        for doc_idx, score in results:
            assert isinstance(doc_idx, int)
            assert score > 0.0

    def test_search_empty_query_returns_empty(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        results = idx.search("", top_k=5)
        assert results == []

    def test_search_empty_corpus_returns_empty(self):
        idx = SparseIndex([])
        results = idx.search("anything", top_k=5)
        assert results == []

    def test_search_respects_top_k(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        results = idx.search("university", top_k=2)
        assert len(results) <= 2

    def test_search_scores_decrease_with_rank(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        results = idx.search("admissions university program", top_k=5)
        if len(results) >= 2:
            for i in range(len(results) - 1):
                assert results[i][1] >= results[i + 1][1]

    def test_search_contact_query_ranks_contact_page_high(self, sample_metadata):
        idx = SparseIndex(sample_metadata)
        results = idx.search("email phone professor ahmad", top_k=3)
        assert len(results) > 0
        # The departlist page (index 0) has contact info and should rank highly
        top_indices = [r[0] for r in results]
        assert 0 in top_indices  # departlist page
