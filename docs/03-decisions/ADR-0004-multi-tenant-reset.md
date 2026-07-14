# ADR-0004 — Multi-tenant par workspaces + refonte du schéma en une passe

**Statut : accepté (2026-07-14) — implémentation en J1**

## Contexte
Cible SaaS : écoles (classes de 200-500 étudiants) puis entreprises.
Schéma actuel mono-user : `articles.user_id NULL = global`, préférences
par user, catégorie globale figée (tech|biz|data|ux) sans sens pour
d'autres secteurs. Par ailleurs : `articles.id` text préfixé par
collecteur (source du bug d'écrasement), `articles.source` text libre
sans FK (impossible de compter les sources d'un événement),
`article_embeddings` vide (vecteurs 384 jamais migrés), aucun utilisateur
réel à préserver.

## Options
1. Migrations incrémentales par-dessus les 10 existantes.
2. **Schéma v2 propre en une migration + `db reset` + ré-ingestion.**

## Décision
**Option 2.** Fenêtre unique : corpus 100 % régénérable (flux publics),
embeddings à reconstruire de toute façon, zéro utilisateur réel.
Contenu du v2 (détail : docs/02-schema-v2.md) :
- `workspaces` / `memberships` (roles owner|teacher|member).
- `sectors` / `sector_topics` : taxonomie PAR secteur, passée au prompt
  d'enrichissement. La catégorie globale disparaît.
- Registre `sources` unifié (curatées `owner_workspace_id NULL` + perso),
  `sector_pack_sources`, `workspace_sources` (pause au niveau workspace —
  pas de préférence par user en v2). `user_sources` et `user_source_prefs`
  disparaissent.
- `articles.id uuid`, dédup par `url_canonical` unique,
  `article_sources` n:n (un article peut venir de plusieurs sources).
- Stories (ADR-0003), engagement au niveau story.
- `ingest_runs` (observabilité) + `daily_volume(day, sector, topic)`.
- Pas de RLS sur le corpus partagé (scope par workspace dans l'API,
  service role) ; RLS stricte sur les tables utilisateur.

## Conséquences
- J0 ne touche PAS au schéma (hors migration 0011 enrich_status) pour ne
  pas mélanger réparation et refonte.
- Chaque utilisateur reçoit un workspace `personal` à l'inscription.
- Après le premier vrai client : plus jamais de `db reset` — migrations
  incrémentales uniquement, et passage Supabase payant (backups).
