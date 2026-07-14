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
- Enrichissement réussi → `ok`. Raté → reste `pending`.
  On conserve les métadonnées brutes ; on n'affiche jamais une carte vide.
- **`attempts` ne s'incrémente QUE si l'échec est imputable au contenu ou à
  l'API** (parse KO, HTTP non-429, clé absente). Voir Révision ci-dessous.
- `attempts >= 3` → `failed` (on arrête de payer pour cet article).
- Chaque run retente les `pending` EN PRIORITÉ, avant les nouveaux, **dans la
  limite de `MAX_RETRY_PER_RUN` (les plus anciens d'abord).**
- **`GET /api/feed` ne sert que `enrich_status='ok'`.** Sans exception.
- Backfill initial : tout article avec `summary is null` → `pending`.
- Le récap de fin de run logue : ok / pending / failed + ventilation Groq
  (appels / ok / 429 / http_err / parse_err).

## Révision (2026-07-14) — correction après premier run réel
La règle initiale « raté → `attempts++` » était fausse : au premier gros
backlog (149 `pending` relancés d'un coup, concurrence 5), le rate limit Groq
(429) a fait échouer des enrichissements **valides**, incrémentant leurs
tentatives jusqu'à `failed`. 4 articles parfaitement enrichissables ont ainsi
été condamnés (vérifié : ré-enrichis OK ensuite). Deux corrections actées :
1. **Distinction de la cause d'échec.** `groqJSON` porte la cause sur l'erreur
   levée (`groqFailure: "rate429" | "http" | "parse"`). Un échec `429` →
   `pending`, `attempts` **inchangé** (surcharge, pas la faute de l'article).
   Un échec `parse`/`http`/clé absente → `attempts++`.
2. **Plafond de retry par run** : `MAX_RETRY_PER_RUN` (défaut 30). La Phase A
   ne retente que les N plus anciens `pending`. Le backlog se draine sur
   plusieurs runs au lieu de saturer le rate limit en une passe.
Mesure associée : augmenter `max_tokens` de l'enrichissement AGGRAVE le 429
(plus de tokens/appel) — donc on n'y touche pas ; le vrai levier est le débit,
pas la taille de réponse.

## Conséquences
- Le volume visible du feed peut baisser temporairement (honnêteté > volume).
- La colonne est reprise telle quelle dans le schéma v2 (ADR-0004).
- Tout nouveau chemin d'ingestion (RSS perso via /api/sources, email en J3)
  DOIT passer par la même machine à états.
- Un backlog important se résorbe en plusieurs runs (borné par
  `MAX_RETRY_PER_RUN`) : c'est voulu, la latence de rattrapage est le prix de
  la stabilité du rate limit.
- Les compteurs de cause (`getAiStats()`) sont le socle de l'observabilité T7.
