
-- Enable pgvector extension
create extension if not exists vector;

-- Create RAG documents table
create table if not exists public.rag_documents (
  id text primary key,
  source_url text not null,
  page_title text not null,
  date_scraped timestamptz not null default now(),
  chunk_index integer not null,
  content text not null,
  content_hash text not null unique,
  embedding vector(384) not null,
  created_at timestamptz not null default now()
);

-- HNSW index for fast similarity search
create index if not exists rag_documents_embedding_hnsw_idx
  on public.rag_documents using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 128);

create index if not exists rag_documents_source_url_idx
  on public.rag_documents (source_url);

-- RPC function for similarity search
create or replace function public.match_rag_documents(
  query_embedding vector(384),
  match_count integer default 15
)
returns table (
  id text,
  source_url text,
  page_title text,
  date_scraped timestamptz,
  chunk_index integer,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    d.id,
    d.source_url,
    d.page_title,
    d.date_scraped,
    d.chunk_index,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.rag_documents d
  order by d.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- Enable RLS
alter table public.rag_documents enable row level security;

-- Public read access (knowledge base is public university info)
create policy "Anyone can read RAG documents"
  on public.rag_documents
  for select
  using (true);
