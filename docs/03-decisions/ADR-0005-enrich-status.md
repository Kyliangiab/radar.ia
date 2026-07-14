# ADR-0005 — enrich_status : aucun article non enrichi servi au feed

**Statut : accepté (2026-07-14) — implémentation en J0 (T3)**

## Contexte
Run du 2026-07-14 : 72/173 enrichissements (42 %) retombés en fallback
null — stockés SANS résumé, en silence. 149/382 articles en base (39 %)
sans résumé. Le compteur "0 échec" de l'ingest ne mesure que les écritures
DB. Le feed affiche des cartes vides. Cause racine : rate limit Groq
(traité par ADR-0002), mais il faut un garde-fou structurel indépendant.

## Options
1. Réparer seulement le rate limit et espérer.
2. Rejeter l'article si l'enrichissement échoue (le perdre).
3. **Machine à états : pending → ok | failed, avec retry prioritaire.**

## Décision
**Option 3.** Colonnes `enrich_status text default 'pending'`
(pending|ok|failed) et `enrich_attempts int default 0` (migration 0011).
Règles :
- Enrichissement réussi → `ok`. Raté → reste `pending`, `attempts++`.
  On conserve les métadonnées brutes ; on n'affiche jamais une carte vide.
- `attempts >= 3` → `failed` (on arrête de payer pour cet article).
- Chaque run retente les `pending` EN PRIORITÉ, avant les nouveaux.
- **`GET /api/feed` ne sert que `enrich_status='ok'`.** Sans exception.
- Backfill initial : tout article avec `summary is null` → `pending`.
- Le récap de fin de run logue : ok / pending / failed / 429.

## Conséquences
- Le volume visible du feed peut baisser temporairement (honnêteté > volume).
- La colonne est reprise telle quelle dans le schéma v2 (ADR-0004).
- Tout nouveau chemin d'ingestion (RSS perso via /api/sources, email en J3)
  DOIT passer par la même machine à états.
