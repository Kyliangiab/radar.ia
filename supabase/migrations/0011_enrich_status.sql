-- 0011_enrich_status.sql
-- ADR-0005 : machine à états d'enrichissement + désactivation PH.
-- Seule migration autorisée en J0.

alter table articles
  add column if not exists enrich_status text not null default 'pending',
  add column if not exists enrich_attempts int not null default 0;

alter table articles
  add constraint articles_enrich_status_chk
  check (enrich_status in ('pending','ok','failed'));

-- Backfill : ce qui a un résumé est ok, le reste repart en pending.
update articles set enrich_status = 'ok'      where summary is not null;
update articles set enrich_status = 'pending' where summary is null;

-- Le feed filtre sur enrich_status='ok' + tri par date : index partiel dédié.
create index if not exists articles_feed_idx
  on articles (published_at desc)
  where enrich_status = 'ok';

-- ADR-0006 : Product Hunt désactivé (CGU non commerciales + token vide).
update sources set active = false where id = 'ph';
