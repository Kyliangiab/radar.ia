-- ─────────────────────────────────────────────────────────────
-- 0007 · Préférences de sources par utilisateur + historique de volume
-- ─────────────────────────────────────────────────────────────

-- Préférences PAR UTILISATEUR sur les sources (globales ou perso) :
-- mettre en pause / retirer une source de SON fil, sans toucher la config
-- partagée. Clé = (user_id, source_id) où source_id = id de `sources`
-- (globale) ou id de `user_sources` (perso).
create table if not exists user_source_prefs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  source_id  text        not null,
  paused     boolean     not null default false,
  removed    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

alter table user_source_prefs enable row level security;

create policy "user_source_prefs: owner full access"
  on user_source_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Historique QUOTIDIEN du volume par domaine (snapshot à chaque ingestion).
-- Permet de calculer les vraies variations (« sujets qui montent / chutent »).
create table if not exists daily_topic_volume (
  day   date not null,
  topic text not null,           -- catégorie : tech | biz | data | ux | autre
  count int  not null default 0,
  primary key (day, topic)
);

alter table daily_topic_volume enable row level security;

-- Agrégat non sensible : lecture ouverte, écriture réservée au service role.
create policy "daily_topic_volume: read all"
  on daily_topic_volume for select
  using (true);
