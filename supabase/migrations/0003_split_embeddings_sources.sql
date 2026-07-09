-- ─────────────────────────────────────────────────────────────
-- v2 du schéma :
--  1. Embeddings sortis dans leur propre table (articles reste léger,
--     le feed ne tire plus 384 floats/ligne via select *).
--  2. Sources = données (table `sources`) → ingestion configurable + ajout RSS.
-- Migration des données AVANT drop de colonne : aucune perte.
-- ─────────────────────────────────────────────────────────────

-- 1. Table d'embeddings dédiée (1:1 avec articles) — e5-base, 768 dims
create table if not exists article_embeddings (
  article_id text primary key references articles (id) on delete cascade,
  embedding  vector(768)
);

-- NB : on ne recopie PAS les anciens vecteurs 384 (e5-small) — incompatibles
-- avec du 768. Ils se régénèrent à la 1re ré-ingestion (e5-base).

-- Index HNSW déplacé sur la nouvelle table
drop index if exists articles_embedding_idx;
create index if not exists article_embeddings_idx
  on article_embeddings using hnsw (embedding vector_cosine_ops);

-- La colonne embedding n'a plus lieu d'être sur articles
alter table articles drop column if exists embedding;

-- 2. match_articles rejoint désormais article_embeddings
create or replace function match_articles(
  query_embedding vector(768),
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
         1 - (e.embedding <=> query_embedding) as similarity
  from article_embeddings e
  join articles a on a.id = e.article_id
  where (filter_category is null or a.category = filter_category)
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- 3. Sources = données (l'ingestion lit cette table ; la vue Sources l'édite)
create table if not exists sources (
  id         text        primary key,
  name       text        not null,
  type       text        not null,          -- hn | devto | rss | producthunt | newsapi
  url        text,                          -- requis pour type rss
  category   text        not null default 'tech',
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

-- Seed : les 9 sources actuelles (mêmes URLs que lib/feeds.ts)
insert into sources (id, name, type, url, category, active) values
  ('hn',           'Hacker News',       'hn',          null,                                                                'tech', true),
  ('devto',        'Dev.to',            'devto',       null,                                                                'tech', true),
  ('techcrunch',   'TechCrunch',        'rss',         'https://techcrunch.com/feed/',                                      'biz',  true),
  ('tcai',         'TechCrunch AI',     'rss',         'https://techcrunch.com/category/artificial-intelligence/feed/',     'data', true),
  ('verge',        'The Verge',         'rss',         'https://www.theverge.com/rss/index.xml',                            'tech', true),
  ('vb',           'VentureBeat',       'rss',         'https://venturebeat.com/feed/',                                     'data', true),
  ('smashing',     'Smashing Magazine', 'rss',         'https://www.smashingmagazine.com/feed/',                            'ux',   true),
  ('lemondepixels','Le Monde Pixels',   'rss',         'https://www.lemonde.fr/pixels/rss_full.xml',                        'tech', true),
  ('lemondeia',    'Le Monde IA',       'rss',         'https://www.lemonde.fr/intelligence-artificielle/rss_full.xml',     'data', true),
  ('ph',           'Product Hunt',      'producthunt', null,                                                                'tech', true),
  ('newsapi',      'NewsAPI',           'newsapi',     null,                                                                'tech', false)
on conflict (id) do nothing;
