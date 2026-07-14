# 02 — Schéma v2 (cible J1)

> ⚠️ NE PAS implémenter en J0. Ce document fige la cible pour que les choix
> J0 restent compatibles. Implémentation : J1, en UNE migration, avec
> `supabase db reset` local puis recréation propre en prod + ré-ingestion
> complète (corpus régénérable — décision ADR-0004).

## Principes
1. Corpus **global et partagé** : un article est ingéré/enrichi UNE fois
   (dédup `url_canonical`), servi à tous les workspaces abonnés à sa source.
2. Le feed affiche des **stories** ; un article isolé = story à 1 membre.
3. L'engagement (lu, favori, quiz) est au niveau **story**.
4. Pas de RLS sur le corpus partagé : scope par workspace dans l'API
   (service role). RLS stricte sur les tables utilisateur uniquement.
5. Taxonomie **par secteur** (remplace le category global tech|biz|data|ux).

## SQL cible

```sql
-- ══ TENANCY ═══════════════════════════════════════════════
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null default 'personal',  -- school|class|company|personal
  plan text not null default 'free',      -- free|pro|school
  created_at timestamptz not null default now()
);

create table memberships (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',    -- owner|teacher|member
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ══ TAXONOMIE ═════════════════════════════════════════════
create table sectors (
  id text primary key,                    -- 'tech','cyber','marketing'…
  name text not null,
  description text
);

create table sector_topics (
  id uuid primary key default gen_random_uuid(),
  sector_id text not null references sectors(id),
  key text not null,
  label text not null,
  unique (sector_id, key)
);

-- ══ SOURCES (registre unifié : curatées ET perso) ═════════
create table sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null,   -- rss|hn|devto|youtube|reddit|github|scrape|email
  name text not null,
  url text,
  homepage text,
  sector_id text references sectors(id),
  owner_workspace_id uuid references workspaces(id) on delete cascade,
    -- NULL = source publique curatée
  status text not null default 'active',  -- active|error|paused
  last_fetch_at timestamptz,
  last_error text,
  error_count int not null default 0,
  created_at timestamptz not null default now()
);
create unique index sources_owner_url_idx
  on sources (coalesce(owner_workspace_id::text,''), url);

create table sector_pack_sources (
  sector_id text not null references sectors(id),
  source_id uuid not null references sources(id) on delete cascade,
  primary key (sector_id, source_id)
);

create table workspace_sources (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  added_by uuid references auth.users(id),
  paused boolean not null default false,
  primary key (workspace_id, source_id)
);
-- user_sources et user_source_prefs DISPARAISSENT (absorbées ci-dessus).

-- ══ CORPUS ════════════════════════════════════════════════
create table stories (
  id uuid primary key default gen_random_uuid(),
  sector_id text references sectors(id),
  topic_id uuid references sector_topics(id),
  title text,
  centroid vector(768),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  article_count int not null default 1,
  source_count int not null default 1,     -- ⟵ remplace heat
  entities text[] not null default '{}',
  synthesis text,
  key_points jsonb,
  divergences jsonb,     -- [{point, versions:[{source, claim}]}]
  angles jsonb,          -- [{source, angle}]
  synth_at timestamptz,
  synth_count int not null default 0
);
create index stories_sector_seen_idx on stories (sector_id, last_seen_at desc);

create table articles (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  url_canonical text not null unique,      -- ⟵ LA clé de dédoublonnage
  title text not null,
  author text,
  published_at timestamptz not null default now(),
  snippet text, image text, lang text,
  sector_id text references sectors(id),
  topic_id uuid references sector_topics(id),
  summary text, key_points jsonb, pullquote text, why_it_matters text,
  entities text[] not null default '{}',   -- ⟵ requis pour le clustering
  enrich_status text not null default 'pending',  -- pending|ok|failed
  enrich_attempts int not null default 0,
  story_id uuid references stories(id),
  enriched_at timestamptz,
  created_at timestamptz not null default now(),
  fetched_at timestamptz not null default now()
);
create index articles_story_idx on articles (story_id);
create index articles_published_idx on articles (published_at desc);

create table article_sources (
  article_id uuid not null references articles(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  primary key (article_id, source_id)
);

create table article_embeddings (
  article_id uuid primary key references articles(id) on delete cascade,
  embedding vector(768) not null
);
create index article_embeddings_idx on article_embeddings
  using hnsw (embedding vector_cosine_ops);

-- ══ ENGAGEMENT (niveau story) ═════════════════════════════
create table story_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  story_id uuid not null references stories(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, story_id)
);
create table saved (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  story_id uuid not null references stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- ══ QUIZ ══════════════════════════════════════════════════
create table story_questions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  question text not null,
  choices jsonb not null,          -- ["A","B","C","D"]
  answer_index int not null,
  difficulty text not null default 'normal',
  generated_at timestamptz not null default now()
);
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score int, total int
);
create table quiz_answers (
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references story_questions(id) on delete cascade,
  chosen_index int not null,
  correct boolean not null,
  primary key (attempt_id, question_id)
);

-- ══ OBSERVABILITÉ ═════════════════════════════════════════
create table ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running',  -- running|ok|failed
  sources_ok int, sources_failed int,
  articles_collected int, articles_new int,
  enriched_ok int, enriched_pending int, enriched_failed int,
  rate_limit_429 int,
  stories_new int, stories_merged int,
  llm_tokens_in bigint, llm_tokens_out bigint,
  error text
);

create table daily_volume (
  day date not null,
  sector_id text not null references sectors(id),
  topic_id uuid references sector_topics(id),
  count int not null default 0,
  primary key (day, sector_id, topic_id)
);
```

## RLS v2
RLS activée (policy owner `auth.uid() = user_id`) sur : `story_reads`,
`saved`, `quiz_attempts`, `quiz_answers`. `memberships` : lecture de ses
propres lignes. Tout le reste : service role uniquement, **aucune** policy.

## Clustering (rappel des règles, détail ADR-0003)
- Candidats : stories même secteur, `last_seen_at > now()-interval '7 days'`,
  top-5 par distance cosinus au centroïde.
- Gate : `sim > τ_high` → merge ; `τ_low < sim ≤ τ_high` ET ≥1 entité
  commune → vérif LLM (~200 tokens) ; sinon nouvelle story.
- τ_low / τ_high : **calibrés sur 50 paires labellisées à la main** avant
  activation. Ne pas deviner.
- Centroïde : moyenne normalisée incrémentale.
- Synthèse : max 1 régénération par story par run ; regénérer seulement si
  `article_count >= synth_count + palier` (paliers 1,2,3,5,8,13,21).
- Recherche : `match` sur article_embeddings, sur-échantillonner
  (match_count × 5) AVANT filtre, puis DISTINCT ON (story_id).
