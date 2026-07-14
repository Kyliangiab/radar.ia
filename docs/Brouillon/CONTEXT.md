# CONTEXT — Radar (Veille-techno)

> Document destiné à un modèle SANS accès au code. Décrit l'état réel du dépôt
> au 2026-07-14, pas la cible. Aucun secret ni URL d'instance. Quand quelque
> chose est cassé ou divergent, c'est signalé explicitement.

## 1. Pitch réel

Radar est une plateforme web de veille techno (Next.js) qui agrège en continu
des flux RSS et API (Dev.to, TechCrunch, The Verge, VentureBeat, Smashing, Le
Monde, Product Hunt), dédoublonne par URL, classe chaque article dans un domaine
(tech / business / data-IA / ux) et le résume via un LLM (Groq), puis stocke le
tout dans Supabase/Postgres avec un vecteur d'embedding pour la recherche
sémantique. Une SPA sous `/app` (auth Google) affiche un fil filtrable, un
briefing du jour généré par IA, des favoris/lus persistés par utilisateur, et
une vue tendances. L'ingestion est un script Node lancé **à la main**
(`npm run ingest`) ; il n'y a aucun cron en place. La recherche sémantique est
**actuellement cassée** faute d'une clé d'API (voir §10).

## 2. Stack

Versions exactes (déclarées `package.json` + verrouillées `package-lock.json`) :

| Élément | Version | Note |
|---|---|---|
| Next.js | 14.2.15 | App Router. Next 15 existe → une majeure de retard, pas EOL. |
| React / react-dom | 18.3.1 | |
| TypeScript | 5.5.3 | `strict: true`. |
| Tailwind CSS | 3.4.6 | + tailwindcss-animate, tailwind-merge, clsx, CVA. |
| @supabase/supabase-js | 2.110.1 | |
| Postgres | 17 | `supabase/config.toml` → `major_version = 17`. |
| pgvector | via `create extension vector` | Dimensions 768, index HNSW cosinus. |
| LLM | Groq API (OpenAI-compatible) | Modèle `llama-3.3-70b-versatile`. |
| Embeddings | @huggingface/transformers 4.2.0 | Modèle `Xenova/multilingual-e5-base`, 768 dims. |
| rss-parser | 3.13.0 | |
| lucide-react | 1.23.0 | |
| tsx | 4.23.0 | Exécute les scripts Node. |
| Runtime cible | Node.js | Pas de champ `engines`. `@types/node` 20.x. |
| Hébergement front+API | Vercel | Détection Next.js auto (cf. DEPLOY.md). |
| Hébergement DB | Supabase cloud | Migrations poussées via `supabase db push`. |
| Ingestion | Local / manuel | Pas serverless (modèle ONNX trop lourd). |

Obsolescence : rien en fin de support strict. Next 14 est une majeure derrière.
`lucide-react` en 1.x est inhabituel (l'écosystème est en 0.x) mais installé tel
quel. Aucune dépendance abandonnée détectée.

Note modèles Groq : le code déclare deux constantes `GROQ_MODEL_ENRICH` et
`GROQ_MODEL_SMART` mais **les deux pointent sur `llama-3.3-70b-versatile`**. Les
commentaires mentionnent `openai/gpt-oss-120b` pour le "SMART", mais il a été
abandonné (quota quotidien trop bas) — un seul modèle est réellement utilisé.

## 3. Arborescence

Arbre à 2 niveaux (hors `node_modules`, `.next`, `.git`) :

```
.
├── app/                    # Next App Router
│   ├── api/                # 8 routes serveur (feed, search, briefing, summarize, ask, translate, sources, stats)
│   ├── app/                # SPA authentifiée (page.tsx "use client", 571 l.)
│   ├── page.tsx            # Landing publique (1292 l., données EN DUR / mockées)
│   ├── layout.tsx, error.tsx, globals.css
├── components/             # Composants React (AppShell, Feed, ArticleDrawer, Sidebar, Topbar, RightRail…)
│   ├── ui/                 # Primitives (button, card, badge, input, skeleton) — style shadcn
│   └── views/              # BriefView, SourcesView, TendancesView
├── config/
│   └── brand.ts            # Nom du produit + identité (contient un nom de personne EN DUR)
├── docs/
│   ├── SOURCES.md          # Justification des 10 sources (livrable)
│   └── CONTEXT.md          # Ce fichier
├── lib/                    # Logique métier (voir détail ci-dessous)
├── scripts/
│   ├── ingest.ts           # Pipeline d'ingestion (LA commande d'auto-alimentation)
│   └── backfill-summary-orig.ts  # Backfill ponctuel du résumé VO
├── supabase/
│   ├── config.toml         # Config CLI Supabase (Postgres 17, auth Google)
│   └── migrations/         # 0001 → 0010 (schéma versionné)
├── .env / .env.local / .env.example  # Variables (divergentes, cf. §10)
├── README.md, DEPLOY.md
├── next.config.mjs, tailwind.config.ts, tsconfig.json, components.json
└── package.json
```

Dossier `lib/` (le cœur, ~1300 lignes) :

- `sources.ts` (443 l.) — collecte : Dev.to, RSS, Product Hunt, NewsAPI ; heat ; dédup ; `collectAll()` (ingestion) et `getFeed()` (live).
- `ai.ts` — client Groq (`groqJSON`), retry/backoff sur 429, `hasGroq()`.
- `embeddings.ts` — embed local (documents) + `embedQuery` via HF hébergé (recherche).
- `enrich.ts` — prompt de classification + résumé + points + punchline (FR + VO).
- `supabase.ts` / `supabaseBrowser.ts` — clients serveur (service role) et navigateur (anon).
- `saved.ts`, `reads.ts`, `sourcePrefs.ts` — accès aux tables RLS côté client.
- `stats.ts`, `notifications.ts`, `relevance.ts`, `edition.ts`, `categories.ts`,
  `feeds.ts`, `types.ts`, `format.ts`, `share.ts`, `toast.ts`, `utils.ts` — utilitaires/UI.

## 4. Modèle de données

Défini par 10 migrations SQL versionnées (`supabase/migrations/0001`→`0010`),
appliquées à l'identique en local et en prod.

### Tables

**`articles`** (corpus principal) :
- `id text PK` (`dev-…`, `rss-…`, `ph-…`, `news-…`), `source text`, `title text`,
  `url text UNIQUE` (clé de dédoublonnage), `author`, `points int` (upvotes),
  `comments int`, `published_at timestamptz`, `category text default 'tech'`
  (tech|biz|data|ux), `tags text[]`, `snippet`, `image`, `heat int` (0..100),
  `summary` (résumé FR), `why_it_matters`, `summary_orig` (résumé VO),
  `key_points jsonb`, `key_points_orig jsonb`, `pullquote`, `pullquote_orig`,
  `user_id uuid → auth.users` (NULL = corpus global ; sinon source perso d'un user),
  `created_at`, `fetched_at`.
- Historique : la colonne `embedding vector(384)` et une colonne générée
  `fts tsvector` existaient en 0001, **supprimées** (0003 pour l'embedding,
  0004 pour le fts). Pas de RLS sur cette table (accès service role uniquement).

**`article_embeddings`** (1:1 avec articles) :
- `article_id text PK → articles(id) ON DELETE CASCADE`, `embedding vector(768)`.
- Séparée d'`articles` pour que le feed ne tire pas 768 floats par ligne.

**`sources`** (config d'ingestion, éditée par la vue Sources) :
- `id`, `name`, `type` (hn|devto|rss|producthunt|newsapi), `url` (requis si rss),
  `category`, `active bool`, `created_at`.
- Seed de 11 sources en 0003. **HN supprimé** en 0006 (source + articles).
  `newsapi` seedé `active=false`. → **9 sources réellement actives**.

**`user_sources`** (flux RSS perso par utilisateur) : `id uuid PK`, `user_id`,
`name`, `url`, `UNIQUE(user_id,url)`. RLS.

**`saved`** (favoris) : PK `(user_id, article_id)`, `created_at`. RLS. Index
`saved_user_idx(user_id, created_at desc)`.

**`article_reads`** (articles lus) : PK `(user_id, article_id)`, `read_at`. RLS.
Index `article_reads_user_idx(user_id, read_at desc)`.

**`user_source_prefs`** (pause/retrait d'une source par user) : PK
`(user_id, source_id)`, `paused bool`, `removed bool`, `updated_at`. RLS.

**`daily_topic_volume`** (snapshot quotidien du volume par domaine) : PK
`(day date, topic text)`, `count int`. RLS lecture ouverte (`select using true`),
écriture réservée au service role.

### Index

`articles_published_idx (published_at desc)`, `articles_category_idx (category)`,
`articles_user_idx (user_id)`, `article_embeddings_idx` (**HNSW**,
`vector_cosine_ops`), + les index utilisateur cités.

### pgvector

- Dimensions : **768** (`vector(768)`), modèle `multilingual-e5-base`.
- Index : **HNSW**, opérateur `vector_cosine_ops` (distance cosinus).
- Fonction RPC `match_articles(query_embedding vector(768), match_count int=12,
  filter_category text=null, match_threshold float=0.0)` : top-k par distance
  cosinus (`1 - (embedding <=> query)` comme similarité), filtre domaine optionnel,
  jointure `article_embeddings ⋈ articles`.

### RLS

Activée sur : `saved`, `user_sources`, `article_reads`, `user_source_prefs`
(policy "owner full access" via `auth.uid() = user_id`), et `daily_topic_volume`
(lecture publique). **PAS** de RLS sur `articles`, `sources`, `article_embeddings`
— ces tables sont manipulées uniquement par le client serveur (service role, qui
bypass RLS de toute façon), donc jamais exposées directement au navigateur.

## 5. Flux principaux

### Flux A — Ingestion (`npm run ingest`, `scripts/ingest.ts`)
Déclencheur : **manuel** (aucun cron/CI en place, cf. §9).
1. `getSupabase()` — sort si Supabase non configuré.
2. `collectAll()` (`lib/sources.ts`) : lit `sources` où `active=true`, interroge
   chaque source (Dev.to sur 5 catégories, RSS, Product Hunt, NewsAPI), en
   parallèle, chaque source échoue en `[]` sans bloquer les autres.
3. Dédoublonnage par URL normalisée + `applyGlobalHeat` (log-normalisation
   votes/commentaires ; repli fraîcheur pour les sources sans votes).
4. Filtre les URLs déjà en base → n'enrichit/embed que les nouveaux.
5. Enrichissement IA concurrent (`ENRICH_CONCURRENCY = 5`) : `enrich()` → Groq →
   category + summary + summaryOrig + 3 points + pullquote + whyItMatters.
6. Embedding local **séquentiel** (runtime ONNX non réentrant) : `embedDocument`
   (préfixe `passage: `, tronqué 1200 car.) → upsert `articles` puis
   `article_embeddings`.
7. Snapshot du jour : compte par domaine → upsert `daily_topic_volume(day, topic)`.
   Fichiers : `scripts/ingest.ts`, `lib/sources.ts`, `lib/enrich.ts`,
   `lib/ai.ts`, `lib/embeddings.ts`, `lib/supabase.ts`.

### Flux B — Embedding
- Documents (ingestion) : **local** ONNX, `embedDocument`, préfixe `passage:`.
- Requêtes (recherche) : **hébergé** via HF Inference router
  (`router.huggingface.co/.../multilingual-e5-base`), préfixe `query:`,
  nécessite `HUGGINGFACE_API_KEY`. Le README explique que l'embedding local en
  serverless causait un cold-start de plusieurs minutes → déporté sur HF.
  **⚠️ Cette clé n'existe dans aucun fichier d'env → la recherche jette (§10).**
  Fichier : `lib/embeddings.ts`.

### Flux C — Recherche (`POST /api/search`)
1. Corps `{ query, category }`. Sort si pas de Supabase / query vide.
2. `embedQuery(query)` (HF) → vecteur 768.
3. `supabase.rpc("match_articles", { query_embedding, match_count: 24, filter_category })`.
4. Renvoie `{ count, articles }`. Toute erreur → `{ error: "search_failed", articles: [] }`.
   Fichiers : `app/api/search/route.ts`, `lib/embeddings.ts`.

### Flux D — Feed (`GET /api/feed?category&uid`)
1. Valide `category` (liste blanche) et `uid` (regex UUID).
2. Si Supabase : **deux requêtes** — corpus global (`user_id is null`, limit 300)
   + articles perso du user (`user_id = uid`, limit 100), concaténés. (Un
   `.or(...)` unique ne remontait pas les persos en prod → contourné.)
3. Sinon / si vide : fallback **live** `getFeed(category)` qui n'interroge que
   **Dev.to** (dégradé, mono-source).
   Fichiers : `app/api/feed/route.ts`, `lib/sources.ts`.

### Flux E — Affichage
1. `/` = landing publique statique (`app/page.tsx`, données mockées).
2. `/app` = SPA cliente : `AuthScreen` (Google OAuth) → `Feed` (appelle
   `/api/feed`), `BriefBanner` (`/api/briefing`), `ArticleDrawer` (lit les
   `key_points`/`pullquote` **stockés**, plus d'appel IA à l'ouverture depuis
   0010), vues Brief / Sources / Tendances. Favoris/lus via clients navigateur RLS.
   Fichiers : `app/app/page.tsx`, `components/*`.

## 6. Endpoints / routes

Toutes en `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

| Méthode | Chemin | Rôle | Protection |
|---|---|---|---|
| GET | `/api/feed` | Fil (DB, fallback live Dev.to). `?category&uid`. | **Publique**. `uid` en query, non authentifié. |
| POST | `/api/search` | Recherche sémantique (embed HF → match_articles). | **Publique**. Cassée (clé HF absente). |
| POST | `/api/briefing` | Briefing du jour (Groq, top 22 titres). | **Publique**. |
| POST | `/api/summarize` | Résumé détaillé FR/EN (Groq). | **Publique**. **Orpheline** (le front ne l'appelle plus). |
| POST | `/api/ask` | Q/R sur un article (Groq). | **Publique**. |
| POST | `/api/translate` | Traduction FR de textes (Groq, repli = original). | **Publique**. |
| GET | `/api/sources` | Liste des sources globales actives. | **Publique**. |
| POST | `/api/sources` | Ajoute un flux RSS perso. | **Protégée** — `Bearer` token vérifié via `supabase.auth.getUser`. |
| GET | `/api/stats` | Variations de volume + données de l'écran d'auth. | **Publique**. |

Seule `POST /api/sources` est authentifiée. Toutes les routes adossées à Groq
(`briefing`, `summarize`, `ask`, `translate`) sont ouvertes et sans rate limit.

## 7. Appels LLM

Un seul fournisseur : **Groq** (`https://api.groq.com/openai/v1/chat/completions`),
modèle `llama-3.3-70b-versatile`, mode JSON strict (`response_format: json_object`),
retry/backoff sur 429 (honore `retry-after`, max 4 tentatives). Sans
`GROQ_API_KEY`, tous les appelants dégradent proprement (pas de crash).

| Appel | Où | maxTokens | Volume | Prompt (résumé) |
|---|---|---|---|---|
| enrich | ingestion (`lib/enrich.ts`) | 1000 | 1 appel / **nouvel** article (peut être des dizaines–centaines par run) | Classe (tech/biz/data/ux) + résumé 2-3 phrases + 3 points + punchline, FR **et** langue d'origine, en JSON. |
| briefing | `/api/briefing` | 1024 | 1 / génération de brief | À partir de ~22 titres du jour : headline + 3-4 tendances + signal à surveiller. |
| summarize | `/api/summarize` | 768 | quasi nul (orphelin) | Résumé 3-4 phrases + why + 3 points + pullquote (systèmes FR et EN). |
| ask | `/api/ask` | 512 | 1 / question utilisateur | Réponse 2-4 phrases sur un article, sans inventer de chiffres. |
| translate | `/api/translate` | 900 | 1 / batch de textes | Traduit en français, garde noms propres/sigles. |

Embeddings : documents = **local** (gratuit, aucune clé) ; requêtes = **HF
Inference** hébergé (nécessite `HUGGINGFACE_API_KEY`).

Coût estimé : Groq est utilisé sur son **tier gratuit** (bridé par tokens/minute
et quota/jour, d'où la concurrence à 5 et le backoff). Coût monétaire par requête
≈ **0 €** tant qu'on reste dans le free tier ; le risque réel est le rate limit,
pas la facture. Aucune télémétrie de coût/tokens en place.

## 8. État de production

- **Déployé** : oui — front+API sur Vercel, DB sur Supabase cloud (cf. DEPLOY.md
  et les commits récents qui débuggent le comportement **en prod**).
- **Domaine** : un domaine `*.vercel.app` (non cité ici). Pas de domaine custom
  documenté.
- **Historique récent** (git) : les 5 derniers commits portent sur le débogage du
  feed en production — visibilité des sources perso, sondes de comptage, exposition
  du projet Supabase utilisé. Signale que le feed a posé des problèmes en prod
  récemment résolus (2 requêtes au lieu d'un `.or`).
- **Utilisateurs** : au moins le développeur (auth Google active). Aucune preuve
  d'une base d'utilisateurs réelle ; l'identité est codée en dur (`config/brand.ts`
  contient un nom de personne, `plan: "Plan Max"`).
- **Auto-alimentation** : **manuelle**. Le README annonce un cron GitHub Actions
  toutes les 6 h — **ce workflow n'existe pas** (pas de dossier `.github/`). Sans
  lancement manuel régulier de `npm run ingest`, le fil et les tendances se figent.
- **Monitoring** : **aucun** (pas d'APM, pas de logs structurés, pas d'alerting).

## 9. Qualité & sécurité — inventaire brutal

| Item | État | Détail |
|---|---|---|
| Tests | **Absent** | 0 fichier `*.test.*` / `*.spec.*`. Aucun framework de test installé. |
| CI | **Absent** | Pas de `.github/`. Le README référence `.github/workflows/ingest.yml` qui n'existe pas. |
| Lint | **Partiel** | `next lint` par défaut ; aucun `.eslintrc` custom ; jamais exécuté en CI. |
| Typage strict | **Présent (partiel)** | `tsconfig` `strict:true`, mais ~9 `: any` explicites (mappers de lignes DB `mapRow(r: any)`). |
| Validation des entrées | **Partiel** | Liste blanche de catégories, regex UUID/URL. Pas de schéma (zod), pas de limite de taille de corps. |
| Gestion des secrets | **Présent (partiel)** | `.env*`/`.DS_Store`/`supabase/.temp` gitignorés. Service role côté serveur uniquement. Mais `.env` et `.env.local` divergent (clés différentes) et aucun ne contient `HUGGINGFACE_API_KEY`. |
| Auth | **Présent (partiel)** | Google OAuth via Supabase, RLS sur les tables utilisateur. Mais 8/9 routes API sont publiques (seul `POST /api/sources` vérifie un Bearer). |
| Rate limiting | **Absent** | Aucune limite sur les routes Groq publiques → abus/épuisement de quota possible. |
| Gestion d'erreurs | **Présent** | try/catch systématiques, dégradation propre (pas de Groq → fallback ; pas de DB → live ; source down → `[]`), timeouts sur tous les fetch externes. |

## 10. Dette technique (10 problèmes, du plus grave au moindre)

1. **[CRITIQUE] Recherche sémantique cassée.** `embedQuery` exige
   `HUGGINGFACE_API_KEY` (`lib/embeddings.ts:43`), **absente de `.env`,
   `.env.local` ET `.env.example`**. `POST /api/search` jette systématiquement →
   `{ error: "search_failed" }`. Une des fonctionnalités phares est hors service.
2. **[ÉLEVÉ] Ingestion non automatisée malgré la doc.** README + DEPLOY décrivent
   un cron GitHub Actions (6 h) ; il n'y a **aucun** `.github/`. L'alimentation est
   100 % manuelle → fil et `daily_topic_volume` se figent sans intervention.
3. **[ÉLEVÉ] Routes LLM publiques sans rate limit.** `ask`, `briefing`,
   `summarize`, `translate` sont ouvertes ; n'importe qui peut épuiser le quota
   Groq (ou, hors free tier, générer un coût). Aucune auth ni throttling.
4. **[MOYEN] Landing entièrement mockée.** `app/page.tsx` annonce « 86 sources »
   et affiche des articles/sources codés en dur (`app/page.tsx:123`, `:662`,
   `:815` : "PostgreSQL 18 ships vector search", "The Batch", "Sifted"…) alors que
   la réalité est **9 sources actives**. Écart marketing vs. produit.
5. **[MOYEN] Dérive documentaire sur les embeddings.** README, `.env.example` et
   le commentaire de `0001_init.sql` parlent d'`e5-small`/`gte-small` **384 dims** ;
   le code réel est `multilingual-e5-base` **768 dims** (migration 0003,
   `lib/embeddings.ts`). Trompeur pour quiconque relit la doc.
6. **[MOYEN] Feed perso via `uid` non authentifié.** `GET /api/feed?uid=…`
   (`app/api/feed/route.ts`) accepte un UUID en clair sans vérifier la session →
   on peut lire les articles des sources perso d'un autre user en devinant son
   UUID. Sensibilité faible (contenu RSS public) mais fuite d'appartenance réelle.
7. **[MOYEN] Route `/api/summarize` orpheline.** Depuis 0010, le drawer lit les
   `key_points`/`pullquote` stockés ; le front n'appelle plus `summarize`. Code
   mort maintenu (surface d'attaque Groq inutile).
8. **[FAIBLE] Fallback « live » mono-source.** `getFeed()` (mode dégradé sans DB)
   n'interroge que Dev.to → fil non représentatif avant la 1re ingestion.
9. **[FAIBLE] Vecteurs 384 dims abandonnés sans re-embed.** La migration 0003
   supprime la colonne `embedding` 384 sans recopier ; `article_embeddings` reste
   vide tant qu'on n'a pas **ré-ingéré**. Une base fraîche a une recherche vide
   même si la clé HF était présente.
10. **[FAIBLE] `any` et identité en dur.** ~9 `: any` (mappers DB), pas de
    validation de schéma sur les corps de requête, et `config/brand.ts` embarque
    un nom de personne réel + `plan: "Plan Max"`. Deux marqueurs `ponytail:`
    signalent des heuristiques assumées comme approximatives (heat global
    `lib/sources.ts:386`, filtre feed `app/api/feed/route.ts:43`).

Aucun `TODO`/`FIXME`/`HACK`/`@ts-ignore` classique dans le code ; la dette est
surtout de la doc périmée, du manque d'automatisation et de l'auth incomplète.

## 11. Ce qui bloquerait une mise en prod pro demain

1. **Réparer la recherche** : fournir `HUGGINGFACE_API_KEY` (ou déporter
   l'embedding requête dans une Edge Function Supabase, comme suggéré dans le
   README) et l'ajouter à `.env.example` + config Vercel.
2. **Automatiser l'ingestion** : mettre en place le cron promis (GitHub Actions,
   VPS, ou scheduler) ; sans lui le produit se périme silencieusement.
3. **Sécuriser les routes LLM** : authentification + rate limiting sur `ask`,
   `briefing`, `translate` (et supprimer `summarize` inutilisée).
4. **Authentifier le feed perso** : dériver l'`uid` de la session serveur, pas
   d'un paramètre de requête devinar­ble.
5. **Dé-mocker la landing** : brancher les vrais compteurs (`/api/stats` existe
   déjà) ou retirer les chiffres/articles fictifs.
6. **Aligner la doc** : corriger toutes les mentions 384 dims / gte-small / cron
   inexistant.
7. **Observabilité** : logs structurés, suivi des tokens Groq, alerting sur échec
   d'ingestion et sur les 429.
8. **Tests + CI** : au minimum un smoke test des routes et du pipeline, exécuté en
   CI, avant tout déploiement.
9. **Discipline des secrets par environnement** : `.env` et `.env.local`
   divergent ; consolider et documenter la matrice de variables (dont la clé HF).
10. **Retirer l'identité codée en dur** (`config/brand.ts`) et rendre le compte /
    le plan dynamiques par utilisateur.
