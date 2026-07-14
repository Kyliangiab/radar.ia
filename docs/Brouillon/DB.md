# DB — État actuel de la base (Radar)

> Schéma **effectif** après application des 10 migrations
> (`supabase/migrations/0001`→`0010`), qui font foi (appliquées à l'identique en
> local `supabase db reset` et en prod `supabase db push`). Postgres **17**,
> extension **pgvector**. Snapshot au 2026-07-14. Aucun secret ici.

## Vue d'ensemble

- **8 tables** dans le schéma `public` + `auth.users` (fourni par Supabase Auth).
- **1 extension** : `vector` (pgvector).
- **1 fonction** : `match_articles(...)` (recherche sémantique cosinus).
- Colonnes historiques **supprimées** : `articles.embedding vector(384)` (→ table
  dédiée en 0003) et `articles.fts tsvector` (→ recherche 100 % sémantique, 0004).
- Source `Hacker News` **retirée** du corpus (0006).

```
auth.users (Supabase Auth)
   │  id (uuid)
   ├──< saved                (favoris)                     RLS
   ├──< article_reads        (articles lus)                RLS
   ├──< user_sources         (flux RSS perso)              RLS
   ├──< user_source_prefs    (pause/retrait par user)      RLS
   └──< articles.user_id     (NULL = corpus global)        pas de RLS

articles ──1:1── article_embeddings   (vector 768, HNSW)   pas de RLS
sources   (config d'ingestion, éditable)                   pas de RLS
daily_topic_volume  (snapshot volume/jour/domaine)         RLS (lecture publique)
```

Relation clé : `articles` porte un `user_id` **nullable**. `NULL` = article du
corpus global (collecté par le pipeline) ; non-NULL = article issu d'une source
RSS **personnelle** d'un utilisateur.

## Tables

### `articles` — corpus principal

Un article de veille (collecté, dédoublonné par URL, classé + résumé par IA).

| Colonne | Type | Contraintes / défaut | Rôle |
|---|---|---|---|
| `id` | `text` | **PK** | `dev-…` / `rss-…` / `ph-…` / `news-…` |
| `source` | `text` | not null | Libellé source ("Dev.to", "TechCrunch"…) |
| `title` | `text` | not null | |
| `url` | `text` | not null **unique** | Clé de dédoublonnage |
| `author` | `text` | | |
| `points` | `integer` | not null default 0 | Upvotes (HN/PH), 0 pour RSS |
| `comments` | `integer` | not null default 0 | |
| `published_at` | `timestamptz` | not null default now() | |
| `category` | `text` | not null default `'tech'` | `tech` \| `biz` \| `data` \| `ux` |
| `tags` | `text[]` | not null default `'{}'` | |
| `snippet` | `text` | | Extrait court |
| `image` | `text` | | |
| `heat` | `integer` | not null default 0 | Score 0..100 (signal relatif) |
| `summary` | `text` | | Résumé IA (FR) |
| `why_it_matters` | `text` | | "Pourquoi c'est important" (FR) |
| `summary_orig` | `text` | *(0009)* | Résumé IA en langue d'origine |
| `key_points` | `jsonb` | *(0010)* | 3 points clés (FR) |
| `key_points_orig` | `jsonb` | *(0010)* | 3 points clés (langue d'origine) |
| `pullquote` | `text` | *(0010)* | Punchline (FR) |
| `pullquote_orig` | `text` | *(0010)* | Punchline (langue d'origine) |
| `user_id` | `uuid` | *(0005)* → `auth.users(id)` ON DELETE CASCADE | NULL = global ; sinon source perso |
| `created_at` | `timestamptz` | not null default now() | |
| `fetched_at` | `timestamptz` | not null default now() | Date de dernière collecte |

**Index** : `articles_published_idx (published_at desc)`,
`articles_category_idx (category)`, `articles_user_idx (user_id)`.
**RLS** : non activée (accès via service role uniquement).
**Supprimé** : `embedding vector(384)` (0003), `fts tsvector` généré + son index GIN (0004).

### `article_embeddings` — vecteurs (1:1 avec `articles`)

Séparée d'`articles` pour que le feed ne tire pas 768 floats par ligne.

| Colonne | Type | Contraintes | Rôle |
|---|---|---|---|
| `article_id` | `text` | **PK** → `articles(id)` ON DELETE CASCADE | |
| `embedding` | `vector(768)` | | `multilingual-e5-base`, préfixe `passage:` |

**Index** : `article_embeddings_idx` — **HNSW**, `vector_cosine_ops` (cosinus).
**RLS** : non activée.
**⚠️** Vide tant que le pipeline n'a pas ré-ingéré : les anciens vecteurs 384
(e5-small) **n'ont pas été migrés** (incompatibles 768). Sans lignes ici, la
recherche ne renvoie rien.

### `sources` — configuration d'ingestion

Liste des sources interrogées par le pipeline (lue par `collectAll()`, éditable
via la vue Sources).

| Colonne | Type | Contraintes / défaut | Rôle |
|---|---|---|---|
| `id` | `text` | **PK** | `devto`, `techcrunch`, `ph`… |
| `name` | `text` | not null | |
| `type` | `text` | not null | `hn` \| `devto` \| `rss` \| `producthunt` \| `newsapi` |
| `url` | `text` | | Requis si `type = rss` |
| `category` | `text` | not null default `'tech'` | Fallback de tri (l'IA reclasse) |
| `active` | `boolean` | not null default true | |
| `created_at` | `timestamptz` | not null default now() | |

**RLS** : non activée.
**Contenu** : seed de 11 lignes (0003), puis **`hn` supprimé** (0006). `newsapi`
seedé `active=false`. → **9 sources actives** : Dev.to, TechCrunch, TechCrunch AI,
The Verge, VentureBeat, Smashing Magazine, Le Monde Pixels, Le Monde IA, Product Hunt.

### `saved` — favoris par utilisateur

| Colonne | Type | Contraintes | |
|---|---|---|---|
| `user_id` | `uuid` | → `auth.users(id)` ON DELETE CASCADE | **PK** (composite) |
| `article_id` | `text` | = `articles.id` | **PK** (composite) |
| `created_at` | `timestamptz` | not null default now() | |

**Index** : `saved_user_idx (user_id, created_at desc)`.
**RLS** : activée — policy *owner full access* : `auth.uid() = user_id`
(using **et** with check).

### `article_reads` — articles lus par utilisateur

| Colonne | Type | Contraintes | |
|---|---|---|---|
| `user_id` | `uuid` | → `auth.users(id)` ON DELETE CASCADE | **PK** |
| `article_id` | `text` | = `articles.id` | **PK** |
| `read_at` | `timestamptz` | not null default now() | |

**Index** : `article_reads_user_idx (user_id, read_at desc)`.
**RLS** : activée — *owner full access* (`auth.uid() = user_id`).

### `user_sources` — flux RSS personnels

Flux qu'un utilisateur ajoute à son propre fil (le corpus global reste dans `sources`).

| Colonne | Type | Contraintes / défaut | |
|---|---|---|---|
| `id` | `uuid` | **PK** default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null → `auth.users(id)` ON DELETE CASCADE | |
| `name` | `text` | not null | Titre auto du flux |
| `url` | `text` | not null | |
| `created_at` | `timestamptz` | not null default now() | |

**Contrainte** : `UNIQUE (user_id, url)`.
**RLS** : activée — *owner full access* (`auth.uid() = user_id`).

### `user_source_prefs` — préférences de sources par utilisateur

Mettre en pause / retirer une source (globale **ou** perso) de SON fil, sans
toucher la config partagée.

| Colonne | Type | Contraintes / défaut | Rôle |
|---|---|---|---|
| `user_id` | `uuid` | → `auth.users(id)` ON DELETE CASCADE | **PK** |
| `source_id` | `text` | | **PK** — id de `sources` (globale) OU de `user_sources` (perso) |
| `paused` | `boolean` | not null default false | Source en pause |
| `removed` | `boolean` | not null default false | Source retirée/archivée |
| `updated_at` | `timestamptz` | not null default now() | |

**RLS** : activée — *owner full access* (`auth.uid() = user_id`).
**Note** : `source_id` est un `text` polymorphe (pas de FK) car il peut pointer
vers `sources.id` (text) ou `user_sources.id` (uuid).

### `daily_topic_volume` — historique de volume par domaine

Snapshot écrit à **chaque ingestion** : nombre d'articles collectés ce jour-là par
domaine. Alimente les variations des Tendances (`/api/stats`).

| Colonne | Type | Contraintes / défaut | |
|---|---|---|---|
| `day` | `date` | | **PK** |
| `topic` | `text` | | **PK** — `tech` \| `biz` \| `data` \| `ux` \| `autre` |
| `count` | `integer` | not null default 0 | |

**RLS** : activée — **lecture publique** (`select using (true)`), écriture
réservée au service role (aucune policy d'insert/update ⇒ bloqué pour anon/auth).
**Idempotent** : upsert sur `(day, topic)` à chaque passage.

## Fonction `match_articles` (recherche sémantique)

```sql
match_articles(
  query_embedding vector(768),
  match_count     int   default 12,
  filter_category text  default null,
  match_threshold float default 0.0
) returns table (
  id, source, title, url, author, points, comments, published_at,
  category, tags, snippet, image, heat, summary, why_it_matters,
  similarity float
)
```

- `language sql stable`.
- Jointure `article_embeddings e ⋈ articles a`.
- `similarity = 1 - (e.embedding <=> query_embedding)` (cosinus).
- Filtre `filter_category` optionnel + seuil `match_threshold`.
- Tri `order by e.embedding <=> query_embedding limit match_count`.
- Appelée par `POST /api/search` avec `match_count: 24`.

## pgvector — configuration

| Paramètre | Valeur |
|---|---|
| Extension | `vector` (`create extension if not exists vector`) |
| Colonne | `article_embeddings.embedding vector(768)` |
| Modèle | `Xenova/multilingual-e5-base` (768 dims, FR↔EN) |
| Index | **HNSW** sur `vector_cosine_ops` |
| Métrique | Distance cosinus (`<=>`) |
| Préfixes e5 | `passage:` (documents stockés) / `query:` (recherche) |

## Sécurité (RLS) — récapitulatif

| Table | RLS | Policy |
|---|---|---|
| `saved` | ✅ | owner (`auth.uid() = user_id`), all |
| `article_reads` | ✅ | owner, all |
| `user_sources` | ✅ | owner, all |
| `user_source_prefs` | ✅ | owner, all |
| `daily_topic_volume` | ✅ | lecture publique ; écriture service role uniquement |
| `articles` | ❌ | manipulée par le service role (routes API) |
| `article_embeddings` | ❌ | idem |
| `sources` | ❌ | idem |

Les tables sans RLS ne sont jamais requêtées avec la clé anon depuis le
navigateur — uniquement côté serveur (service role, qui bypass RLS). Le client
navigateur (`supabaseBrowser`, clé anon) ne touche que les 5 tables RLS.

## Points d'attention / dette liée à la DB

1. **`article_embeddings` peut être vide** sur une base neuve ou récemment
   migrée (les vecteurs 384 dims n'ont pas été convertis en 768) → recherche
   muette tant qu'on n'a pas relancé `npm run ingest`.
2. **`source_id` polymorphe sans FK** dans `user_source_prefs` : pas d'intégrité
   référentielle, un id orphelin est possible (géré applicativement, cf.
   `purgeArchivedSource`).
3. **`daily_topic_volume` ne se remplit qu'à l'ingestion** ; l'ingestion étant
   manuelle (pas de cron en place), l'historique des Tendances reste creux si le
   script n'est pas lancé quotidiennement.
4. **Aucune RLS sur `articles`** : correct tant que l'accès reste serveur, mais
   la route `GET /api/feed?uid=…` filtre par `user_id` à partir d'un paramètre
   non authentifié (pas une faille DB, mais un contournement applicatif du
   cloisonnement des sources perso).
5. **`key_points` / `key_points_orig` en `jsonb`** (tableaux de strings) — pas de
   contrainte de forme au niveau DB, validé côté applicatif (`enrich.ts`).
