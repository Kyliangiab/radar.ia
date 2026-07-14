# 04 — Journal

> Mis à jour par Claude Code en fin de chaque session.
> Format : date · fait / en cours / bloqué / prochaine étape.

## 2026-07-15 — T6 validé (run cron vert)
- Run GitHub Actions #2 (workflow_dispatch, Node 22) = **Success** en 6m23s.
  Ingest : 80 collectés, 2 nouveaux, `ok=2 · pending=0 · failed=0 · 429=0`.
  Preuve de bout en bout : cron OK, secrets injectés (check T7 passé), récap
  instrumenté. **T6 = terminé.**
- Avertissements du run (non bloquants) : (a) `next@14.2.15` CVE critique
  (déjà dette J1, remontée par `npm ci`) ; (b) actions checkout/setup-node@v4
  tournent sur Node 24 forcé (déprécation Node 20 côté actions) — cosmétique.
- **J0 : reste uniquement T11 (vitest + CI).**

## 2026-07-15 — T11 vitest + CI (J0 terminé)
- **vitest** ajouté (+ config, alias `@`). Scripts : `typecheck`, `test`,
  `test:watch`. `lib/enrich.ts` refactor : extraction de 2 fonctions PURES
  (`parseEnrichment`, `decideOutcome`) réutilisées par enrich/enrichOutcome
  (comportement inchangé) pour les rendre testables.
- **Tests (19, tous verts)** : `lib/url.test.ts` (canonicalUrl, migré node:test→
  vitest), `lib/enrich.test.ts` (parsing + machine à états ADR-0005 dont
  « 429 ne consomme pas de tentative »), `app/api/feed/gate.test.ts` (gate
  `enrich_status='ok'` + `?uid=` ignoré, supabase mocké).
- **ESLint** installé (eslint 8.57 + eslint-config-next 14.2.35 + `.eslintrc.json`
  `next/core-web-vitals`). `next.config.mjs` : `eslint.ignoreDuringBuilds=true`
  (sinon `next build` échouait sur le lint → aurait cassé Vercel).
- **CI** `.github/workflows/ci.yml` : sur PR + push main, Node 22, `npm ci` →
  typecheck + test **bloquants**, lint **non bloquant** (`continue-on-error`).
- Vérif : test 19/19 ✓ · typecheck ✓ · `next build` ✓.
- **Action Kylian (hors code)** : protéger `main` → Settings → Branches → règle
  → « Require status checks to pass » → cocher le job `check`. Sinon la CI
  tourne mais ne bloque pas réellement le merge.
- **J0 TERMINÉ** (T1→T11). Reste hors J0 : migration Next 15, tests navigateur.

## Dette / à traiter
- **[lint] ~10 `react/no-unescaped-entities`** (apostrophes JSX) + 1 warning
  exhaustive-deps. À nettoyer, puis rendre le lint BLOQUANT en CI (retirer
  `continue-on-error` + `ignoreDuringBuilds`).
- ~~[CRITIQUE] Next.js 14.2.15 = vulnérabilité critique~~ → **CVE CRITIQUE
  RÉGLÉE le 2026-07-15** : bump `next@14.2.35` (drop-in, 0 breaking change).
  Le critique « Authorization Bypass in Middleware » (GHSA-f82v-jwr5-mffw)
  était patché dès 14.2.25. Reste 1 HIGH + 1 MODERATE (avis DoS Server
  Components / SSRF WebSocket / cache poisoning + postcss) patchés seulement
  en **15.5.16+** → nécessitent la migration Next 15 ci-dessous.
- **[HIGH — J1 ou fin J0] Migration Next 15 (audit 100 % propre).** Plan :
  cible `next@15.5.20`. Points à vérifier (breaking changes 14→15) :
  1. **React 19** : Next 15 le recommande. Vérifier compat (app en 18.3.1) —
     rester en React 18 si Next 15 l'autorise, sinon bump React 19 + tester.
  2. **Async request APIs** : `cookies()/headers()/draftMode()/params/
     searchParams` deviennent async. `grep` d'usage (les routes utilisent
     `request.headers.get()` = Web API, non impacté ; à confirmer).
  3. **Defaults de cache** : `fetch` et route handlers `GET` non cachés par
     défaut (aligné avec notre `no-store`/`force-dynamic` — vérifier).
  4. **ESLint 9 / next lint**, `next/font`, config.
  5. Vérif : `tsc` + `next build` + run local + les 3 flux clés (feed, search,
     ajout de source) + ISR landing.
  → ADR à créer quand exécuté (décision structurante).
- ~~[T8] `app/api/sources/route.ts` : `onConflict:"id"` + insert `summary=null`~~
  → **SOLDÉ** (T8 fait le 2026-07-14) : `onConflict:"url"` + enrich/embed immédiat.

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

## 2026-07-14 — T8 /api/sources enrichit immédiatement
- `enrichOutcome` + type `EnrichStatus` déplacés dans `lib/enrich.ts` (exportés)
  → machine à états à source UNIQUE, partagée ingest + route (ADR-0005).
- `lib/embeddings.ts` : appel HF factorisé (`hfEmbed`) → `embedQuery` (query:) +
  nouveau `embedDocumentHosted` (passage:). Parité mesurée cosinus **1.000** vs
  embed ONNX local. Sert les routes serverless (ONNX local trop lourd, ADR-0001).
- `collectUserFeed` : `cleanFeedName` (rejette titre vide / > 60 car. / tronqué
  "…" → hostname ; corrige "Immobilier : Toute l'actualité…") + URLs canoniques.
- `app/api/sources` POST : `maxDuration=60`, cap 10, dédup canonique, détection
  "déjà présent" (remplace `ignoreDuplicates` — ne réécrit jamais `user_id`),
  puis pour chaque nouvel article : `enrichOutcome` → upsert `onConflict:"url"`
  AVANT embedding (leçon FK T3) → embed HF best-effort. Réponse honnête
  `{name,count,fresh,ok,pending}`. Un enrich raté = `pending`/`failed` repris
  par le cron. **Plus aucun `onConflict:"id"` en code** (dette soldée).
- Vérif : tsc ✓ · nommage 5/5 ✓ · parité embed 1.000 ✓ · `collectUserFeed`
  URLs canoniques ✓ · chemin de stockage complet testé contre DB prod (article
  synthétique inséré `ok`+embedding puis supprimé, cascade OK) ✓.
- Non testé en CLI : wrapper HTTP auth (Bearer→user_id, inchangé). Test navigateur
  réel = ajouter un flux perso → voir les articles enrichis au feed immédiatement.
- Reste J0 : T9 (sécurité routes + rate limit + zod ; supprimer /api/summarize),
  T10 (UI honnête), T11 (vitest/CI). + dette : bump Next (CVE critique, J1).
- Prochaine étape : T9.

## 2026-07-14 — T10 UI honnête
- **Cartographie (3 agents)** : `/api/stats` et `TendancesView` déjà honnêtes ;
  `config/brand.ts USER` = code mort ; compte réel vient de la session.
- **Données réelles** : `/api/stats` expose `ingestDays` (jours d'ingestion
  distincts, all-time = 2) et `lastFetchedAt` (max fetched_at). Type `StatsResp`
  étendu.
- **Nº d'édition** (`lib/edition.ts`) : EPOCH date-dérivé supprimé. `editionInfo(d,
  ingestDays)` → `Nº` = vrais jours d'ingestion (décision Kylian), sinon date
  seule. Plus de « 187 » (page.tsx, Sidebar, TendancesView, AuthScreen +
  BriefBanner). Sidebar/Topbar reçoivent stats via AppShell.
- **Topbar** : « Synchro HH:MM » (horloge locale déguisée) → « Dernière collecte ·
  il y a Xh » depuis `lastFetchedAt` (`timeAgo`), masqué si null. Point « live »
  non-pulsant.
- **RightRail** : `nextBrief` 06:00 fictif → `nextCollect` aligné cron réel
  (00/06/12/18 UTC) ; « Ton rituel » → « Prochaine collecte » ; « notifié 5 min
  avant » retiré (→ backlog) ; faux « +47 % »/sparkline/« 03 » quand !hasHistory
  → « Historique en cours de constitution ».
- **AuthScreen** : `FALLBACK_PANELS` fabriqués (« Series A ↑ 22 % ») + headline
  de repli → placeholders neutres (« Analyse en cours… »).
- **Marque** : export `USER` supprimé (brand.ts) ; fallback « Plan Max »
  (Sidebar) → « Compte connecté ».
- **SourcesView** : sélecteur de fréquence (cosmétique) retiré ; toast à DEUX
  chiffres « X trouvés, Y ajoutés au fil » (`count`/`ok`) ; « N art. » → « — »
  si feed non chargé (+ santé neutre) ; 9 prefs `removed=true` de test purgées.
- **Compteur « surveillées »** unifié (page.tsx = même déf. que SourcesView :
  (globales∪perso) − removed valides).
- **Landing `app/page.tsx`** (minimal, décision Kylian) : rendue `async` ;
  branché SEULEMENT les 2 blocs KPI (l.605+749) sur `articleCount` + sources
  actives réels (422 / 8). Reste (%, témoignages fabriqués, autres chiffres) → J1.
- **BUG révélé & corrigé — cache Next sur supabase-js** : Next met en cache le
  `fetch` sous-jacent (Data Cache disque, persistant) → `/api/stats` servait un
  vieux `articleCount` (243 au lieu de 422). `lib/supabase.ts` : client serveur
  forcé en `cache:"no-store"` → lectures toujours fraîches (affectait aussi
  feed/search). ⚠️ landing désormais rendue dynamiquement (2 count/visite) — OK
  au stade actuel ; ISR possible plus tard si trafic.
- Vérif : tsc ✓ · `/api/stats` frais 422 malgré cache ✓ · landing 422/8 ✓ ·
  plus de « 187 »/« +47 » dans l'app ✓. Test navigateur (Kylian) recommandé.
- Reste J0 : **T11** (vitest + CI). Dette J1 : témoignages landing, notif, Next CVE.
- Prochaine étape : T11.

## 2026-07-14 — T10 addendum : ISR de la landing
- `lib/supabase.ts` : `getSupabase()` reste `no-store` (routes API fraîches) ;
  ajout `getSupabaseISR(revalidate=600)` (fetch `next.revalidate`).
- `app/page.tsx` : `export const revalidate = 600` + `getSupabaseISR()`.
- `next build` : `/` = `○ (Static)` (ISR, régénérée ≤ 10 min) avec compteurs
  réels (422/8) prérendus ; routes API = `ƒ (Dynamic)`. Plus de hit DB par
  visite sur la landing.

## 2026-07-14 — T9 sécurité des routes
- `lib/apiGuard.ts` (nouveau) : `requireUser` (Bearer → getUser → 401),
  `clientIp` (x-forwarded-for), `rateLimit` (Map mémoire, fenêtre glissante ;
  best-effort par instance en serverless — documenté, quota réel = J3).
- `zod` ajouté (dép. justifiée, plan T9). Schémas de corps ask/briefing/translate.
- **ask / briefing** : session requise (`requireUser`) + rate limit 20/min/user
  + zod. **translate** : PUBLIC (landing pré-login) mais durci — zod, caps
  (≤12 textes, ≤500 car./texte, ≤4000 total), rate limit 30/min/IP. Choix acté
  avec Kylian (option "public durci").
- **feed** : uid dérivé de la session serveur (Bearer) ; `?uid=` **ignoré**
  (fuite du feed perso d'autrui fermée). Sans token → global seul.
- **/api/summarize supprimée** (orpheline, 0 appelant).
- Front : Bearer ajouté sur `ArticleDrawer` (ask), `page.tsx` (briefing + feed,
  `?uid=` retiré). `AuthScreen` (translate) inchangé.
- Vérif curl (dev) : ask 401 ✓ · briefing 401 ✓ · translate 200 / 400 (12+) /
  400 (>4000) ✓ · rate limit 30×200 + 5×429 ✓ · feed ?uid=bidon → 200 global ✓.
  tsc ✓. Happy-path authed (ask/briefing/feed perso) = test navigateur (token
  de session).
- Reste J0 : T10 (UI honnête), T11 (vitest/CI). + dette : bump Next CVE (J1).
- Prochaine étape : T10.

## 2026-07-14 — Fix régression T9 + diagnostic SourcesView (pré-T10)
- **Régression T9 corrigée** (introduite par moi) : `page.tsx` `load()` attend
  désormais un token (feed dérive l'uid de la session) ; l'appel `onSourceAdded`
  passait encore `session.user.id`. Corrigé → `session.access_token` (2 appels).
- **Diagnostic SourcesView** (bugs prod signalés par Kylian ; aucune modif) :
  - Compteurs « surveillées / archivées / aucune source » = fidèles à la donnée :
    9 `user_source_prefs.removed=true` réels (8 globales + 1 perso), créés par
    les clics « Retirer » de test de Kylian (confirmé). **Aucun écrivain de masse
    dans le code** (seul `remove()` écrit `removed=true`). Pas un bug.
  - « N art. · dans le fil » = `countBySource[s.name]` sur le feed CHARGÉ.
    Simulation : toutes les cartes matchent (Dev.to 138, TechCrunch 52, perso
    « Le Monde.fr » 10…). Le « 0 art. » n'apparaît que si `articles` est vide au
    rendu (feed pas encore chargé) → pas un bug de calcul, mais indicateur fragile.
- **À intégrer au plan T10** (vrais problèmes d'honnêteté) :
  1. « N art. · dans le fil » : compteur dépendant du feed chargé (0 trompeur) →
     refléter un vrai count DB par source, ou retirer/relibeller.
  2. Deux formules divergentes pour « Sources surveillées » (`rows.length` vue
     SourcesView vs `g+u−removed` sidebar `page.tsx:277`) → unifier.
  3. Nettoyer les 9 `removed=true` de test (delete) en début de T10.
  4. **Toast d'ajout de source ment** (repéré en prod sur Numerama : « 15
     articles collectés / dans ton fil » alors que cap = 10). La route renvoie
     `count = feed.articles.length` (collectés AVANT cap/dédup/fresh) ; le toast
     `SourcesView.tsx:125-129` affiche `d.count` + « dans ton fil ». Or seuls
     `d.ok` sont réellement servis. → toast basé sur `ok` (+ distinguer
     « collectés » vs « ajoutés »). Code déployé = bien T8 (réponse a ok/fresh/
     pending) ; c'est un compteur qui ment, pas un déploiement obsolète.
