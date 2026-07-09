-- ─────────────────────────────────────────────────────────────
-- Sources RSS PERSONNELLES : les flux qu'un utilisateur ajoute lui-même.
-- Le corpus global reste dans `sources` (collecté par le script/cron).
-- Ces flux-ci sont propres à chaque compte (RLS).
-- ─────────────────────────────────────────────────────────────

create table if not exists user_sources (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  url        text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

alter table user_sources enable row level security;

create policy "user_sources: owner full access"
  on user_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Provenance d'un article : NULL = corpus global, sinon = source perso d'un user.
alter table articles add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists articles_user_idx on articles (user_id);
