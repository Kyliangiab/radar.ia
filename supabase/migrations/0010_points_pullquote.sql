-- Points clés + punchline stockés à l'ingestion (FR + langue d'origine).
-- (colonne `points` déjà prise = upvotes → on utilise `key_points`.)
-- Objectif : le drawer n'appelle PLUS l'IA à l'ouverture (free tier Groq limité
-- par minute) — tout est lu depuis la base, instantanément.
alter table articles add column if not exists key_points jsonb;
alter table articles add column if not exists key_points_orig jsonb;
alter table articles add column if not exists pullquote text;
alter table articles add column if not exists pullquote_orig text;
