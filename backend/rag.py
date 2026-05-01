from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

import httpx
import numpy as np

from backend.config import Settings

if TYPE_CHECKING:
    import faiss as _faiss
    from sentence_transformers import CrossEncoder, SentenceTransformer

logger = logging.getLogger(__name__)
TOKEN_RE = re.compile(r"\w+")
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?(?:\d[\s-]?){10,13}")
STOP_WORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "in",
    "on",
    "for",
    "to",
    "is",
    "are",
    "what",
    "when",
    "where",
    "who",
    "how",
    "department",
    "university",
    "kashmir",
    "cuk",
}
CONTACT_WORDS = {"contact", "email", "phone", "mobile", "faculty", "teacher", "hod", "coordinator"}
COUNT_WORDS = {"count", "many", "number", "numbers", "total", "list", "selected", "eligible", "form"}


@dataclass(slots=True)
class RetrievedChunk:
    text: str
    source_url: str
    page_title: str
    date_scraped: str
    chunk_index: int
    score: float


@dataclass(slots=True)
class RetrievalOutput:
    chunks: list[RetrievedChunk]
    confidence: float
    mode: str
    metadata: dict[str, Any]


@dataclass(slots=True)
class ScoredCandidate:
    idx: int
    distance: float | None
    dense_score: float
    sparse_score: float
    rrf_score: float
    heuristic_score: float
    rerank_score: float
    final_score: float
    matched_by: set[str]


class SparseIndex:
    def __init__(self, metadata: list[dict[str, Any]]):
        self.rows = metadata
        self.doc_tokens: list[list[str]] = []
        self.df: dict[str, int] = {}
        self.avgdl = 0.0
        self._build()

    def _build(self) -> None:
        self.doc_tokens.clear()
        self.df.clear()
        total_len = 0
        for row in self.rows:
            text = " ".join(
                [
                    str(row.get("text", "")),
                    str(row.get("page_title", "")),
                    str(row.get("source_url", "")),
                    str(row.get("normalized_title", "")),
                ]
            )
            tokens = [t.lower() for t in TOKEN_RE.findall(text)]
            self.doc_tokens.append(tokens)
            total_len += len(tokens)
            for token in set(tokens):
                self.df[token] = self.df.get(token, 0) + 1
        self.avgdl = (total_len / len(self.doc_tokens)) if self.doc_tokens else 0.0

    def search(self, query: str, top_k: int) -> list[tuple[int, float]]:
        if not self.doc_tokens:
            return []
        tokens = [t.lower() for t in TOKEN_RE.findall(query)]
        if not tokens:
            return []
        n = len(self.doc_tokens)
        k1 = 1.5
        b = 0.75
        scores: list[tuple[int, float]] = []
        for idx, doc in enumerate(self.doc_tokens):
            if not doc:
                continue
            score = 0.0
            doc_len = len(doc)
            for token in tokens:
                tf = doc.count(token)
                if tf == 0:
                    continue
                df = self.df.get(token, 0)
                idf = np.log(1 + (n - df + 0.5) / (df + 0.5))
                denom = tf + k1 * (1 - b + b * (doc_len / max(1.0, self.avgdl)))
                score += idf * (tf * (k1 + 1) / denom)
            if score > 0:
                scores.append((idx, float(score)))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]


class RagPipeline:
    @staticmethod
    def _sanitize_source_url(source_url: str, page_title: str) -> str:
        raw = (source_url or "").strip()
        if not raw:
            return raw
        parsed = urlparse(raw.lower())
        host = parsed.netloc
        title = (page_title or "").lower()
        # Some legacy PDF chunks stored the first URL found in document body.
        # If page title clearly represents local scraped file identity, normalize to file://.
        if host and not (
            "cuk" in host
            or "disgenweb" in host
            or host.endswith(".ac.in")
            or host.endswith(".gov.in")
        ):
            if "cukapi disgenweb in p" in title or title.endswith(".pdf"):
                safe_title = re.sub(r"\s+", "_", title).strip("_")
                return f"file://{safe_title or 'document.pdf'}"
        return raw

    @staticmethod
    def _is_allowed_source_url(url: str) -> bool:
        # Empty source URLs can exist in locally indexed legacy records.
        # Keep them eligible to avoid dropping otherwise strong chunks.
        if not url:
            return True
        u = url.lower().strip()
        if u.startswith("file://"):
            return True
        host = urlparse(u).netloc
        allowed = (
            "cukashmir.ac.in",
            "cukashmir.in",
            "ugc.gov.in",
            "admin.cukashmir.in",
            "cukapi.disgenweb.in",
        )
        return (
            any(a in host for a in allowed)
            or host.endswith(".ac.in")
            or host.endswith(".gov.in")
            or "cuk" in host
            or "disgenweb" in host
        )

    def __init__(self, settings: Settings):
        self.settings = settings
        self.embedder: SentenceTransformer | None = None
        self.reranker: CrossEncoder | None = None
        self.index: _faiss.Index | None = None
        self.metadata: list[dict[str, Any]] = []
        self.sparse_index: SparseIndex | None = None
        self.supabase_enabled = bool(settings.supabase_url and settings.supabase_service_role_key)

    def _ensure_embedder(self) -> SentenceTransformer:
        if self.embedder is None:
            from sentence_transformers import SentenceTransformer

            self.embedder = SentenceTransformer(self.settings.embedding_model)
        return self.embedder

    def _ensure_reranker(self) -> CrossEncoder:
        if self.reranker is None:
            from sentence_transformers import CrossEncoder

            self.reranker = CrossEncoder(self.settings.reranker_model)
        return self.reranker

    def load_index(self, index_path: Path | None = None, metadata_path: Path | None = None) -> None:
        meta_path = metadata_path or self.settings.metadata_path
        if meta_path.exists():
            self.metadata = json.loads(meta_path.read_text(encoding="utf-8"))
            for row in self.metadata:
                row["source_url"] = self._sanitize_source_url(
                    str(row.get("source_url", "")),
                    str(row.get("page_title", "")),
                )
            self.sparse_index = SparseIndex(self.metadata)
        if self.settings.rag_store == "supabase":
            return
        import faiss

        faiss_path = index_path or self.settings.faiss_index_path
        if not faiss_path.exists():
            raise FileNotFoundError(f"FAISS index not found: {faiss_path}")
        self.index = faiss.read_index(str(faiss_path))
        if not self.metadata:
            if not meta_path.exists():
                raise FileNotFoundError(f"Metadata not found: {meta_path}")
            self.metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        if self.sparse_index is None:
            self.sparse_index = SparseIndex(self.metadata)

    @property
    def index_size(self) -> int:
        if self.settings.rag_store == "supabase":
            return 0
        return 0 if self.index is None else int(self.index.ntotal)

    @lru_cache(maxsize=1024)
    def embed_query(self, query: str) -> tuple[float, ...]:
        vec = self._ensure_embedder().encode([query], normalize_embeddings=True, convert_to_numpy=True)[0]
        return tuple(float(x) for x in vec.tolist())

    @staticmethod
    def _is_contact_intent(query: str) -> bool:
        q = query.lower()
        return any(
            key in q
            for key in (
                "contact",
                "phone",
                "email",
                "teacher",
                "faculty",
                "biotechnology",
                "hod",
                "department",
                "dept",
            )
        )

    def _host_rank(self, url: str) -> int:
        """Prefer CUK pages over generic UGC or other hosts when scores are similar."""
        url_lower = url.lower()
        if "cukashmir.ac.in" in url_lower or "cukashmir.in" in url_lower:
            return 2
        if "ugc.gov.in" in url_lower:
            return 1
        return 0

    def _source_relevance_boost(self, query: str, source_url: str, page_title: str, text: str) -> float:
        """Lightweight intent-aware boost to keep contacts/department queries grounded."""
        if not self._is_contact_intent(query):
            return 0.0
        url = (source_url or "").lower()
        title = (page_title or "").lower()
        body = (text or "").lower()
        boost = 0.0
        if any(k in url for k in ("departlist", "department", "departments", "heads-coordinators", "contact")):
            boost += 1.2
        if any(k in title for k in ("department", "contact", "coordinator", "faculty", "teacher")):
            boost += 0.8
        if re.search(r"\b(email|phone|mobile|tel|contact)\b", body):
            boost += 0.8
        if "biotech" in query.lower() and "biotech" in body:
            boost += 0.6
        return boost

    @staticmethod
    def _query_tokens(query: str) -> set[str]:
        return {t.lower() for t in TOKEN_RE.findall(query)}

    def _entity_overlap_score(self, query: str, source_url: str, page_title: str, text: str) -> float:
        tokens = {t for t in self._query_tokens(query) if len(t) > 2 and t not in STOP_WORDS}
        if not tokens:
            return 0.0
        haystack = " ".join([source_url, page_title, text[:600]]).lower()
        overlap = sum(1 for token in tokens if token in haystack)
        return min(1.0, overlap / max(1, len(tokens)))

    @staticmethod
    def _canonical_source_key(url: str, title: str) -> str:
        u = (url or "").strip().lower()
        t = (title or "").strip().lower()
        if u.startswith("file://"):
            # collapse local filename variants that differ only by encoding/symbols
            u = u.replace("%20", " ").replace("_", " ").replace("-", " ")
            u = re.sub(r"\s+", " ", u)
        return f"{u}::{t}"

    def _heuristic_score(self, query: str, row: dict[str, Any]) -> float:
        query_tokens = self._query_tokens(query)
        url = str(row.get("source_url", "")).lower()
        title = str(row.get("page_title", "")).lower()
        text = str(row.get("text", "")).lower()
        score = 0.0
        contact_intent = bool(query_tokens & CONTACT_WORDS)
        table_intent = bool(query_tokens & COUNT_WORDS)
        if contact_intent:
            if EMAIL_RE.search(text):
                score += self.settings.weight_heuristic_contact * 0.6
            if PHONE_RE.search(text):
                score += self.settings.weight_heuristic_contact * 0.4
            if any(hint in url for hint in ("contact", "faculty", "department", "departlist")):
                score += self.settings.weight_heuristic_contact * 0.45
        if table_intent:
            if bool(row.get("has_table", False)):
                score += self.settings.weight_heuristic_table * 0.7
            if int(row.get("table_row_count", 0)) >= 2:
                score += self.settings.weight_heuristic_table * 0.3
        score += self.settings.weight_heuristic_entity * self._entity_overlap_score(
            query=query,
            source_url=url,
            page_title=title,
            text=text,
        )
        if any(n in text for n in ("page not found", "404", "server error")):
            score -= self.settings.weight_heuristic_noise
        # For contact/count intents, prioritize official web pages over noisy local files.
        if (contact_intent or table_intent) and url.startswith("file://") and not (EMAIL_RE.search(text) or PHONE_RE.search(text)):
            score -= self.settings.weight_heuristic_noise * 0.7
        return score

    def _distance_to_cosine(self, distance: float) -> float:
        cosine = 1.0 - (distance / 2.0)
        return float(max(0.0, min(1.0, cosine)))

    @staticmethod
    def _final_score_to_confidence(final_score: float) -> float:
        # Smooth mapping for hybrid score confidence calibration.
        # Keeps confidence useful even when sparse/rerank evidence dominates.
        mapped = 1.0 / (1.0 + np.exp(-(final_score - 0.35) * 2.2))
        return float(max(0.0, min(1.0, mapped)))

    def _rerank(self, query: str, candidates: list[ScoredCandidate], metadata: list[dict[str, Any]]) -> list[ScoredCandidate]:
        if not candidates:
            return []
        pairs = [(query, metadata[c.idx]["text"]) for c in candidates]
        try:
            rerank_scores = self._ensure_reranker().predict(pairs).tolist()
        except Exception:
            rerank_scores = [0.0 for _ in pairs]
        for candidate, rerank_score in zip(candidates, rerank_scores, strict=False):
            meta_row = metadata[candidate.idx]
            source_boost = self._source_relevance_boost(
                query=query,
                source_url=str(meta_row.get("source_url", "")),
                page_title=str(meta_row.get("page_title", "")),
                text=str(meta_row.get("text", "")),
            )
            candidate.rerank_score = float(rerank_score + source_boost)
            rerank_norm = max(-5.0, min(5.0, candidate.rerank_score)) / 5.0
            dense_component = self.settings.weight_dense * candidate.dense_score
            sparse_component = self.settings.weight_sparse * candidate.sparse_score
            rrf_component = self.settings.weight_rrf * candidate.rrf_score
            rerank_component = self.settings.weight_rerank * rerank_norm
            candidate.final_score = dense_component + sparse_component + rrf_component + rerank_component + candidate.heuristic_score
        candidates.sort(key=lambda c: c.final_score, reverse=True)
        return candidates[: max(1, self.settings.final_top_k)]

    def _to_retrieved_chunks(
        self,
        metadata: list[dict[str, Any]],
        ranked: list[ScoredCandidate],
    ) -> tuple[list[RetrievedChunk], float]:
        if not ranked:
            return [], 0.0
        chunks: list[RetrievedChunk] = []
        seen_source_keys: set[str] = set()
        confidence = 0.0
        for row in ranked:
            meta = metadata[row.idx]
            if not self._is_allowed_source_url(str(meta.get("source_url", ""))):
                continue
            source_key = self._canonical_source_key(
                str(meta.get("source_url", "")),
                str(meta.get("page_title", "")),
            )
            if source_key in seen_source_keys:
                continue
            seen_source_keys.add(source_key)
            distance = row.distance if row.distance is not None else 2.0 * (1.0 - max(0.0, min(1.0, row.dense_score)))
            cosine = self._distance_to_cosine(distance)
            hybrid_conf = max(cosine, self._final_score_to_confidence(row.final_score))
            confidence = max(confidence, hybrid_conf)
            chunk = RetrievedChunk(
                text=str(meta.get("text", "")),
                source_url=str(meta.get("source_url", "")),
                page_title=str(meta.get("page_title", "")),
                date_scraped=str(meta.get("date_scraped", "")),
                chunk_index=int(meta.get("chunk_index", 0)),
                score=float(cosine * 0.4 + row.final_score * 0.6),
            )
            chunks.append(chunk)
        return chunks, confidence

    def _rrf_fuse(
        self,
        dense: list[tuple[int, float, float]],
        sparse: list[tuple[int, float]],
        metadata: list[dict[str, Any]],
        query: str,
    ) -> list[ScoredCandidate]:
        merged: dict[int, ScoredCandidate] = {}
        for rank, (idx, distance, dense_score) in enumerate(dense, start=1):
            current = merged.get(idx)
            if current is None:
                current = ScoredCandidate(
                    idx=idx,
                    distance=distance,
                    dense_score=dense_score,
                    sparse_score=0.0,
                    rrf_score=0.0,
                    heuristic_score=0.0,
                    rerank_score=0.0,
                    final_score=0.0,
                    matched_by={"dense"},
                )
                merged[idx] = current
            current.rrf_score += 1.0 / (self.settings.rrf_k + rank)
        for rank, (idx, sparse_score) in enumerate(sparse, start=1):
            current = merged.get(idx)
            if current is None:
                current = ScoredCandidate(
                    idx=idx,
                    distance=None,
                    dense_score=0.0,
                    sparse_score=sparse_score,
                    rrf_score=0.0,
                    heuristic_score=0.0,
                    rerank_score=0.0,
                    final_score=0.0,
                    matched_by={"sparse"},
                )
                merged[idx] = current
            else:
                current.sparse_score = max(current.sparse_score, sparse_score)
                current.matched_by.add("sparse")
            current.rrf_score += 1.0 / (self.settings.rrf_k + rank)
        candidates = list(merged.values())
        for candidate in candidates:
            candidate.heuristic_score = self._heuristic_score(query, metadata[candidate.idx])
        candidates.sort(key=lambda c: c.rrf_score + c.heuristic_score, reverse=True)
        return candidates

    def _local_retrieve(self, query: str) -> tuple[list[RetrievedChunk], float, dict[str, Any]]:
        if self.index is None:
            raise RuntimeError("Index not loaded.")
        t0 = time.perf_counter()
        query_vec = np.array([self.embed_query(query)], dtype=np.float32)
        distances, indices = self.index.search(query_vec, max(1, self.settings.dense_top_k))
        dense: list[tuple[int, float, float]] = []
        for idx, distance in zip(indices[0], distances[0], strict=False):
            if idx < 0:
                continue
            dense.append((int(idx), float(distance), self._distance_to_cosine(float(distance))))
        sparse: list[tuple[int, float]] = []
        if self.settings.sparse_enabled and self.sparse_index is not None:
            sparse = self.sparse_index.search(query, max(1, self.settings.sparse_top_k))
            if sparse:
                max_sparse = max(s for _, s in sparse)
                sparse = [(idx, (score / max_sparse) if max_sparse > 0 else 0.0) for idx, score in sparse]
        fused = self._rrf_fuse(dense=dense, sparse=sparse, metadata=self.metadata, query=query)
        rerank_input = fused[: max(1, self.settings.rerank_candidate_k)]
        reranked = self._rerank(query=query, candidates=rerank_input, metadata=self.metadata)
        reranked.sort(
            key=lambda row: (self._host_rank(self.metadata[row.idx].get("source_url", "")), row.final_score),
            reverse=True,
        )
        chunks, confidence = self._to_retrieved_chunks(self.metadata, reranked)
        metrics = {
            "candidate_count": len(fused),
            "rerank_input_count": len(rerank_input),
            "selected_chunk_count": len(chunks),
            "timings_ms": {
                "total": int((time.perf_counter() - t0) * 1000),
            },
        }
        return chunks, confidence, metrics

    def _supabase_retrieve(self, query: str) -> tuple[list[RetrievedChunk], float, dict[str, Any]]:
        if not self.supabase_enabled:
            return [], 0.0, {"candidate_count": 0, "rerank_input_count": 0, "selected_chunk_count": 0, "timings_ms": {"total": 0}}
        t0 = time.perf_counter()
        query_vec = list(self.embed_query(query))
        rpc_url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/rpc/match_rag_documents"
        headers = {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }
        payload = {"query_embedding": query_vec, "match_count": max(1, self.settings.dense_top_k)}
        try:
            with httpx.Client(timeout=20) as client:
                res = client.post(rpc_url, json=payload, headers=headers)
                res.raise_for_status()
            rows = res.json() or []
        except Exception as exc:
            logger.warning("supabase retrieve failed: %s", exc)
            return [], 0.0, {"candidate_count": 0, "rerank_input_count": 0, "selected_chunk_count": 0, "timings_ms": {"total": 0}}
        if not rows:
            return [], 0.0, {"candidate_count": 0, "rerank_input_count": 0, "selected_chunk_count": 0, "timings_ms": {"total": int((time.perf_counter() - t0) * 1000)}}

        dense: list[tuple[int, float, float]] = []
        temp_meta: list[dict[str, Any]] = []
        for idx, row in enumerate(rows):
            source_url = str(row.get("source_url", ""))
            if not self._is_allowed_source_url(source_url):
                continue
            temp_meta.append(
                {
                    "text": row["content"],
                    "source_url": self._sanitize_source_url(source_url, str(row.get("page_title", ""))),
                    "page_title": row["page_title"],
                    "date_scraped": str(row["date_scraped"]),
                    "chunk_index": int(row["chunk_index"]),
                    "has_table": bool(row.get("has_table", False)),
                    "table_row_count": int(row.get("table_row_count", 0)),
                    "normalized_title": str(row.get("normalized_title", "")),
                }
            )
            similarity = float(row.get("similarity", 0.0))
            distance = 2.0 * (1.0 - max(0.0, min(1.0, similarity)))
            dense.append((len(temp_meta) - 1, distance, similarity))
        sparse: list[tuple[int, float]] = []
        if self.settings.sparse_enabled:
            sparse_index = SparseIndex(temp_meta)
            sparse = sparse_index.search(query, max(1, self.settings.sparse_top_k))
            if sparse:
                max_sparse = max(s for _, s in sparse)
                sparse = [(idx, (score / max_sparse) if max_sparse > 0 else 0.0) for idx, score in sparse]
            # Augment with global local-metadata sparse matches to improve recall in supabase mode.
            if self.sparse_index is not None and self.metadata:
                global_sparse = self.sparse_index.search(query, max(1, self.settings.sparse_top_k))
                if global_sparse:
                    gmax = max(s for _, s in global_sparse)
                    existing = {
                        self._canonical_source_key(str(m.get("source_url", "")), str(m.get("page_title", "")))
                        for m in temp_meta
                    }
                    for gidx, gscore in global_sparse:
                        row = self.metadata[gidx]
                        source_key = self._canonical_source_key(
                            str(row.get("source_url", "")),
                            str(row.get("page_title", "")),
                        )
                        if source_key in existing:
                            continue
                        temp_meta.append(
                            {
                                "text": str(row.get("text", "")),
                                "source_url": str(row.get("source_url", "")),
                                "page_title": str(row.get("page_title", "")),
                                "date_scraped": str(row.get("date_scraped", "")),
                                "chunk_index": int(row.get("chunk_index", 0)),
                                "has_table": bool(row.get("has_table", False)),
                                "table_row_count": int(row.get("table_row_count", 0)),
                                "normalized_title": str(row.get("normalized_title", "")),
                            }
                        )
                        sparse.append((len(temp_meta) - 1, (gscore / gmax) if gmax > 0 else 0.0))
                        existing.add(source_key)
        fused = self._rrf_fuse(dense=dense, sparse=sparse, metadata=temp_meta, query=query)
        rerank_input = fused[: max(1, self.settings.rerank_candidate_k)]
        reranked = self._rerank(query=query, candidates=rerank_input, metadata=temp_meta)
        reranked.sort(
            key=lambda row: (self._host_rank(temp_meta[row.idx].get("source_url", "")), row.final_score),
            reverse=True,
        )
        chunks, confidence = self._to_retrieved_chunks(temp_meta, reranked)
        metrics = {
            "candidate_count": len(fused),
            "rerank_input_count": len(rerank_input),
            "selected_chunk_count": len(chunks),
            "timings_ms": {
                "total": int((time.perf_counter() - t0) * 1000),
            },
        }
        return chunks, confidence, metrics

    def retrieve(self, query: str) -> RetrievalOutput:
        if self.settings.rag_store == "supabase":
            local_chunks, confidence, metrics = self._supabase_retrieve(query)
            local_mode = "supabase"
        else:
            local_chunks, confidence, metrics = self._local_retrieve(query)
            local_mode = "faiss"

        # Apply a confidence gate: if even the best match is weak, treat it as "no answer".
        if local_chunks and confidence < self.settings.confidence_threshold:
            local_chunks = []
            local_mode = f"{local_mode}_low_confidence"
            confidence = 0.0

        # Scraper-first policy: no Exa fallback; stay grounded in owned crawled data.
        return RetrievalOutput(chunks=local_chunks, confidence=confidence, mode=local_mode, metadata=metrics)
