create extension if not exists vector;

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

create index if not exists rag_documents_embedding_ivfflat_idx
  on public.rag_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists rag_documents_source_url_idx
  on public.rag_documents (source_url);

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
