
-- Move vector extension to extensions schema
create extension if not exists vector schema extensions;

-- Fix search_path on match function
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
set search_path = public
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
