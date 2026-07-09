-- La recherche est 100% sémantique (embeddings). Le plein-texte tsvector (fts)
-- n'est plus utilisé par le front → on le supprime.
drop index if exists articles_fts_idx;
alter table articles drop column if exists fts;
