-- The live column had drifted to vector(1024) (bge-large) while the backend embeds queries with
-- all-MiniLM-L6-v2 (384), so every match_rag_documents call failed with "different vector dimensions".
-- Old 1024-dim rows cannot be cast down: clear them, then re-run scripts/ingest.py + scripts/sync_supabase.py.
drop index if exists public.rag_documents_embedding_hnsw_idx;
truncate table public.rag_documents;
alter table public.rag_documents alter column embedding type vector(384);
create index rag_documents_embedding_hnsw_idx on public.rag_documents
  using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 128);
