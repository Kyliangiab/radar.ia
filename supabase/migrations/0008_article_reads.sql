-- ─────────────────────────────────────────────────────────────
-- Articles lus — par utilisateur (auth.users), sécurisé RLS.
-- Persiste l'état "lu" (grisé) entre les sessions / appareils.
-- ─────────────────────────────────────────────────────────────

create table if not exists article_reads (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  article_id text        not null,        -- = articles.id
  read_at    timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists article_reads_user_idx on article_reads (user_id, read_at desc);

alter table article_reads enable row level security;

create policy "article_reads: owner full access"
  on article_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
