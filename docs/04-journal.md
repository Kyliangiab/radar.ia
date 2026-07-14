# 04 — Journal

> Mis à jour par Claude Code en fin de chaque session.
> Format : date · fait / en cours / bloqué / prochaine étape.

## 2026-07-14 — Initialisation
- Fait : paquet de docs installé (vision, plan, schéma v2, 6 ADR,
  migration 0011, workflow d'ingestion). HUGGINGFACE_API_KEY créée
  (fine-grained, Inference Providers uniquement).
- En cours : J0.
- Bloqué : —
- Prochaine étape : T1 (modèles Groq en env).

## 2026-07-14 — J0 T1→T4 (code)
- Fait (code + typecheck + tests isolés verts) :
  - **T1** — modèles Groq lus depuis l'env via fonctions paresseuses
    `groqModelEnrich()` / `groqModelSmart()` (défauts ADR-0002 :
    `openai/gpt-oss-20b` / `openai/gpt-oss-120b`). Const → fonctions car les
    imports sont évalués AVANT `dotenv.config()` dans l'ingest (vérifié). 5
    call-sites migrés. Vars ajoutées à `.env`, `.env.local`, `.env.example`.
    Plus aucun `llama-3.3-70b` (déprécié) dans le code.
  - **T2** — régime de tokens : suppression de la génération VO à l'ingestion
    (colonnes conservées ; VO à la demande via `/api/translate`) ; troncature
    input `ENRICH_INPUT_MAX_CHARS` (800) ; cap `MAX_ARTICLES_PER_SOURCE` (15)
    dans `collectAll()` (garde les plus chauds) ; `ENRICH_CONCURRENCY` rendu
    réglable (défaut 5, comportement inchangé). 3 vars documentées dans
    `.env.example`.
  - **T3** — machine à états `enrich_status` : `enrichOutcome()` (ok / pending
    +attempts++ / failed à 3) ; retry PRIORITAIRE des `pending` (update ciblé,
    pas de bump `fetched_at`) puis nouveaux ; feed gaté sur `enrich_status='ok'`
    (les 2 requêtes global+perso) ; récap honnête retentés/nouveaux/ok/pending/
    failed (le "0 échec" trompeur disparaît). Tests machine à états 7/7.
  - **T4** — `lib/url.ts` `canonicalUrl()` (strip `utm_*`/`fbclid`/`ref`,
    fragment, trailing slash, host minuscule) + `lib/url.test.ts` (node:test,
    8/8, aucune dépendance ajoutée) ; dédup sur URL canonique dans
    `collectAll()`+`getFeed()` (mutation `a.url`=canonique) ; ingest Phase B
    `onConflict:"url"`, Phase A en `update().eq("id")` → **plus aucun
    `onConflict:"id"`** dans le pipeline d'ingestion.
- En cours / bloqué : **validation DB réelle T3+T4 en attente**. La migration
  `0011_enrich_status.sql` n'est PAS appliquée en prod (colonne `enrich_status`
  absente, vérifié). Push délégué à Kylian (pas de mot de passe DB / access
  token dispo côté agent ; `npm run ingest` lui reste faisable via SERVICE_ROLE).
- À faire après migration : `npm run ingest` réel → vérifier récap + `curl
  /api/feed` (uniquement enrichis, pas de doublons utm). Puis critères sortie J0.
- Dette signalée (hors périmètre T1-T4, à traiter en T8) :
  `app/api/sources/route.ts:73` upsert encore `onConflict:"id"` + insère des
  lignes `summary=null` (désormais correctement exclues du feed par le gate T3,
  car `enrich_status` défaut `pending`). T8 = enrich immédiat + `onConflict:url`.
- Prochaine étape : appliquer 0011 (Kylian) → validation réelle → T5.

## 2026-07-14 — Validation réelle T3/T4 + fix FK + T7 (instrumentation, remonté)
- Migration 0011 poussée en prod par Kylian (confirmé Remote). CLI `supabase`
  gardé en devDependency (volontaire, requis CI/T6 — Homebrew HS côté Kylian).
- **Bug d'ordre trouvé en run réel (introduit par moi en T3)** : en Phase B
  j'insérais l'embedding AVANT la ligne `articles` → violation FK
  `article_embeddings.article_id → articles(id)` (migration 0003) → 29 puis
  9 erreurs DB. **Corrigé** : article écrit AVANT embedding (Phase A déjà safe,
  lignes préexistantes). Run final = **0 erreur DB**.
- **Backfill URL canonique** (données héritées) : 72 URLs non canoniques en base
  (surtout slash final d'avant T4) → collisions PK `id` en Phase B. Backfill
  one-shot (72 UPDATE, 0 collision, 0 suppression, liens valides) → dédup
  `onConflict:"url"` cohérent sur tout le corpus.
- **T7 remonté (instrumentation)** : `lib/ai.ts` compte+logue désormais
  429 / http_err (avec status+corps) / parse_err (avec `finish_reason` +
  200 car. bruts). Récap d'ingest ventile `Groq: appels/ok/429/http_err/parse_err`.
  `ENRICH_MAX_TOKENS` rendu réglable (défaut 1000).
- **Hypothèse reasoning INFIRMÉE** (test 1000 vs 2000 sur 5 failed/pending) :
  `parse_err=0`, aucun `finish_reason="length"` — gpt-oss-20b émet son JSON dans
  1000. À 2000 : `429=4` → **augmenter max_tokens AGGRAVE le 429**, on NE monte
  PAS. Cause réelle des échecs passés = 429 sous le backlog de retry (149 d'un
  coup), pas le parsing. Backlog drainé → runs stables.
- État base : ok=394 · pending=1 · failed=4 · total=399. Gate cohérent
  (0 `ok` sans summary). Durée run ~340 s (dominée par embedding local + réseau).
- À décider (Kylian) : reset des 4 `failed` → `pending` (faux échecs 429, ré-
  enrichissables) pour les récupérer. Non fait sans ton feu vert.
- Reste J0 : T5 (recherche HF), T6 (cron), T7 (finir : check démarrage), T8
  (/api/sources onConflict:"id" + enrich immédiat), T9, T10, T11.
- Prochaine étape : ton go sur reset des 4 failed, puis T5.

## 2026-07-14 — Fixes structurels ADR-0005 (avant T5)
- 4 `failed` (faux échecs 429) remis en `pending` (attempts=0) → tous revenus
  `ok` au run suivant. État base : **ok=400 · pending=0 · failed=0**.
- **Fix 1 — un 429 ne compte plus comme tentative.** `groqJSON` porte la cause
  sur l'erreur (`groqFailure: rate429|http|parse`) ; `enrich()` la remonte
  (`failReason`) ; `enrichOutcome` n'incrémente `attempts` que pour parse/http/
  clé absente. Concurrency-safe (cause portée par l'erreur, pas par les stats
  globales soumises à la course des 5 appels //). Test unitaire 7/7.
- **Fix 2 — `MAX_RETRY_PER_RUN` (défaut 30).** Phase A retente seulement les N
  plus anciens `pending` (`order created_at asc`), + log du backlog total. Le
  backlog se draine sur plusieurs runs sans saturer le rate limit.
- ADR-0005 mis à jour (section Décision + Révision + Conséquences) : correction
  de la décision initiale, pas contournement.
- Nouvelles env documentées : `ENRICH_MAX_TOKENS` (1000), `MAX_RETRY_PER_RUN` (30).
- Prochaine étape : **T5** (recherche HF / `embedQuery` parité e5-base).

## 2026-07-14 — T5 recherche (vérif, 0 changement code)
- Fait : parité modèle confirmée (`Xenova/multilingual-e5-base` local ↔
  `intfloat/multilingual-e5-base` HF = même modèle 768-dim ; cosinus
  query↔passage 0.927). `match_articles` bien en `vector(768)` +
  jointure `article_embeddings` (0003). HF sert toujours le modèle
  (embedQuery → 768 dims). Pas de plan B nécessaire.
- Test HTTP réel `/api/search` (npm run dev + curl) : `count=24`, résultats
  pertinents (IA défense/startups). Critère « résultats en local » ✅.
- Le code était déjà correct → aucune modification. T5 = vérification.
- Reste à couvrir (ops, hors code) : `HUGGINGFACE_API_KEY` présente dans l'env
  **Vercel** pour le « ET en prod » du critère de sortie — non vérifiable depuis
  l'agent. Le plan la dit « ajoutée partout (fait côté humain) » ; à confirmer
  par un `curl` sur l'URL de prod.
- Bilan session : T1→T5 faits + 2 correctifs structurels (fix FK ordre embedding,
  révision ADR-0005 sur le 429). Base : ok=400 / pending=0 / failed=0.
- Reste J0 : T6 (cron GH Actions), T7 (finir : check démarrage bloquant),
  T8 (/api/sources : onConflict:"id" + summary=null → enrich immédiat),
  T9 (sécurité routes + zod), T10 (UI honnête), T11 (vitest/CI).
- Prochaine étape : T6 (ou selon priorité Kylian).

## 2026-07-14 — T6 cron GitHub Actions
- `.github/workflows/ingest.yml` créé (il n'existait pas malgré le message de
  commit initial). Cron toutes les 6 h (`0 */6 * * *`) + `workflow_dispatch`.
  `concurrency: ingest` (pas de run //), Node 20, `npm ci`, `npm run ingest`,
  timeout 20 min. 6 secrets en env (SUPABASE_URL, SERVICE_ROLE_KEY, GROQ_API_KEY,
  GROQ_MODEL_ENRICH/SMART, HUGGINGFACE_API_KEY). YAML validé (ruby).
- NB : l'ingest utilise l'embedding LOCAL (ONNX e5-base) → pas besoin de la clé
  HF pour le cron ; incluse par cohérence. dotenv sur `.env.local` absent en CI
  = no-op, les vars viennent du bloc `env:` (lecture lazy de process.env).
- Validation live = pousser + lancer un `workflow_dispatch` manuel (Actions) →
  run vert. Non exécutable depuis l'agent. À surveiller au 1er run : sync
  package-lock (npm ci) + durée (téléchargement modèle ONNX la 1re fois).
- Prochaine étape : T7 (finir : check de démarrage bloquant — l'instrumentation
  429/http_err/parse_err est déjà faite).

## 2026-07-14 — T6 fix Node 22 + T7 complet
- **Run GH Actions #1 a échoué** : `@supabase/supabase-js` v2.110 (RealtimeClient)
  exige le WebSocket natif → Node 22+ (« native WebSocket not found » sous Node
  20). Corrigé : `node-version: 20 → 22` dans le workflow (aligné machine locale
  22.13). À repousser + relancer un `workflow_dispatch`.
- **T7 terminé** : check de démarrage `checkEnv()` en tête de `main()`
  (`scripts/ingest.ts`). Requises (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY) manquantes/vides (`?.trim()`) → message net + `exit 1` À LA
  SECONDE 0 (avant tout réseau). Optionnelles vides (GROQ_MODEL_ENRICH/SMART) →
  warning + défaut code. Vérifié depuis un dossier sans `.env` (= conditions CI,
  `injected env (0)`). Répond au symptôme du run #1 (secret absent = erreur
  immédiate, pas plantage obscur 3 min plus tard).
- T7 = intégralement fait (instrumentation Groq + check démarrage).
- Reste J0 : T8 (/api/sources : onConflict:"id" + summary=null → enrich immédiat
  + nommage auto), T9 (sécurité routes + zod), T10 (UI honnête), T11 (vitest/CI).
- Prochaine étape : T8.
