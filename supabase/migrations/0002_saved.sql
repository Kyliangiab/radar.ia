-- ─────────────────────────────────────────────────────────────
-- Favoris / articles enregistrés — par utilisateur (auth.users), sécurisé RLS.
-- Remplace le stockage localStorage : source de vérité = la base.
-- ─────────────────────────────────────────────────────────────

create table if not exists saved (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  article_id text        not null,        -- = articles.id (hn-… / dev-… / rss-…)
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists saved_user_idx on saved (user_id, created_at desc);

alter table saved enable row level security;

-- Chaque utilisateur ne voit et ne modifie QUE ses propres favoris.
create policy "saved: owner full access"
  on saved for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
