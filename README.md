# Radar — plateforme de veille technologique auto-alimentée

Agrège en continu l'actualité **Tech · Business · Data & IA · UX**, la dédoublonne,
la **résume + classe automatiquement (IA)**, la **vectorise** pour une recherche
sémantique, et la restitue dans un dashboard filtrable.

Stack : **Next.js 14 · TypeScript · Tailwind · Supabase (Postgres + pgvector) · Groq**.
LLM via **Groq** (API OpenAI-compatible, modèles `gpt-oss`) pour le résumé, la
classification et le briefing. Embeddings **100 % locaux** (`multilingual-e5-small`,
384 dims) — aucune clé externe pour la vectorisation, FR↔EN.

---

## Architecture (pipeline 4 couches)

```
Ingestion               Traitement                 Stockage            Restitution
HN·Dev.to·RSS·PH  ──►  dédup → IA (résumé+classe)  ──►  Supabase     ──►  Dashboard
(scripts/ingest)         → embedding (e5-small)         articles+vector    + recherche
                                                        (pgvector/HNSW)    sémantique
```

- **`scripts/ingest.ts`** — LA commande qui auto-alimente : `npm run ingest`.
- **`app/api/feed`** — lit la base (fallback *live* si base vide/absente).
- **`app/api/search`** — recherche **sémantique** (embedding requête → `match_articles` RPC, distance cosinus) ou **mot-clé** (`fts` / tsvector).
- **`app/api/briefing`** / **`summarize`** — briefing du jour + résumés IA (Groq).

---

## Démarrage local

```bash
npm install
cp .env.example .env.local     # GROQ_API_KEY + SUPABASE_URL/KEY
```

### Base de données (locale → prod, reproductible via la CLI Supabase)

```bash
npm i -g supabase              # ou npx supabase ...
supabase start                 # Postgres local (Docker) AVEC pgvector inclus
supabase db reset              # applique supabase/migrations/*.sql en local
```

La **même** migration part en prod, à l'identique :

```bash
supabase link --project-ref <ref>
supabase db push               # applique les migrations sur le projet cloud
```

> Le schéma (`supabase/migrations/0001_init.sql`) crée la table `articles`,
> la colonne `embedding vector(384)`, l'index **HNSW** cosinus et la fonction
> `match_articles(...)`. C'est *versionné* → repro garantie local/prod.

### Lancer

```bash
npm run ingest                 # remplit la base (à lancer une 1re fois)
npm run dev                    # http://localhost:3000
```

Sans Supabase configuré : l'app tourne en **mode dégradé** (flux live, sans
recherche). Sans `GROQ_API_KEY` : pas de résumé/briefing/classification IA
(tout retombe en catégorie `tech`). Les **embeddings marchent toujours** (locaux).

---

## Auto-alimentation

- **Minimum (démo live)** : `npm run ingest` récupère et met à jour la base sans
  aucune édition manuelle.
- **Niveau visé (planifié)** : `.github/workflows/ingest.yml` relance le pipeline
  toutes les 6 h (+ `workflow_dispatch` pour la démo). Secrets à ajouter dans le
  repo : `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  (+ `PH_API_TOKEN` optionnel pour Product Hunt).

---

## Déploiement

- **Front + API** : Vercel (détection Next.js auto). Variables d'env identiques au `.env.local`.
- **Base** : projet Supabase (les migrations y sont poussées via `supabase db push`).
- ⚠️ **Recherche sémantique sur Vercel** : l'embedding de la requête charge un modèle
  ONNX (lourd en serverless, cold start). En local / sur un host Node (Railway,
  Render, Fly) c'est transparent. Alternative propre pour la prod Vercel : déporter
  l'embedding de requête dans une **Supabase Edge Function** (`Supabase.ai` embarque
  gte-small nativement). Point d'extension documenté dans le code.

---

## Sources & extension

**10 sources** (RSS + API) couvrant les 4 domaines — détail et justification dans
[`docs/SOURCES.md`](docs/SOURCES.md) (livrable) :

- **API** : Hacker News (Algolia), Dev.to, Product Hunt (GraphQL V2, `PH_API_TOKEN`).
- **RSS** : TechCrunch, TechCrunch AI, The Verge, VentureBeat, Smashing Magazine,
  Le Monde (Pixels + IA).
- **NewsAPI** optionnel (`NEWSAPI_KEY`, dev/localhost only — désactivé par défaut).

Config des flux dans [`lib/feeds.ts`](lib/feeds.ts). Ajouter une API = une fonction
`fetchX()` dans [`lib/sources.ts`](lib/sources.ts) branchée dans `collectExtraSources()`.
Ces sources additionnelles ne tournent **que** dans le pipeline d'ingestion (Node),
jamais dans une route serverless.

## Personnalisation (brand)

- Nom / textes : `config/brand.ts`
- Couleurs (palette Marple) : `app/globals.css` → `--accent` / `--hot`
- Domaines & requêtes sources : `lib/categories.ts`
- Modèle d'embedding : `lib/embeddings.ts` (garder 384 dims, sinon ajuster la migration)
