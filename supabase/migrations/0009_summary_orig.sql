-- Résumé en LANGUE D'ORIGINE (en plus du résumé français `summary`).
-- Le fil reste en français ; le drawer peut ouvrir en VO instantanément.
alter table articles add column if not exists summary_orig text;
