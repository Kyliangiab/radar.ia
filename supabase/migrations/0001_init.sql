-- ─────────────────────────────────────────────────────────────
-- Radar — schéma initial : articles + vectorisation (pgvector)
-- Appliqué à l'identique en local (supabase db reset) et en prod (supabase db push)
-- ─────────────────────────────────────────────────────────────

create extension if not exists vector;

create table if not exists articles (
  id             text primary key,               -- id source (hn-… / dev-… / rss-…)
  source         text not null,                  -- 'HN' | 'Dev.to' | 'RSS:…'
  title          text not null,
  url            text not null unique,           -- dédoublonnage principal
  author         text,
  points         integer not null default 0,
  comments       integer not null default 0,
  published_at   timestamptz not null default now(),
  category       text not null default 'tech',   -- domaine : tech | biz | data | ux
  tags           text[] not null default '{}',
  snippet        text,
  image          text,
  heat           integer not null default 0,
  summary        text,                           -- résumé IA
  why_it_matters text,                           -- "pourquoi c'est important" IA
  embedding      vector(384),                    -- Supabase/gte-small (384 dims)
  fts            tsvector generated always as (
                   to_tsvector('simple',
                     coalesce(title,'') || ' ' || coalesce(snippet,'') || ' ' || coalesce(summary,''))
                 ) stored,                        -- recherche plein-texte (fallback mot-clé)
  created_at     timestamptz not null default now(),
  fetched_at     timestamptz not null default now()
);

create index if not exists articles_published_idx on articles (published_at desc);
create index if not exists articles_category_idx  on articles (category);
create index if not exists articles_fts_idx       on articles using gin (fts);
create index if not exists articles_embedding_idx on articles using hnsw (embedding vector_cosine_ops);

-- Recherche sémantique : top-k par distance cosinus, filtre domaine optionnel.
-- (gte-small produit des cosinus élevés → on pilote par match_count, pas par seuil.)
create or replace function match_articles(
  query_embedding vector(384),
  match_count     int   default 12,
  filter_category text  default null,
  match_threshold float default 0.0
)
returns table (
  id text, source text, title text, url text, author text,
  points int, comments int, published_at timestamptz, category text,
  tags text[], snippet text, image text, heat int,
  summary text, why_it_matters text, similarity float
)
language sql stable
as $$
  select a.id, a.source, a.title, a.url, a.author, a.points, a.comments,
         a.published_at, a.category, a.tags, a.snippet, a.image, a.heat,
         a.summary, a.why_it_matters,
         1 - (a.embedding <=> query_embedding) as similarity
  from articles a
  where a.embedding is not null
    and (filter_category is null or a.category = filter_category)
    and 1 - (a.embedding <=> query_embedding) >= match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;
