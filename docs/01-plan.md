# 01 — Ordre de bataille

> Pas de dates. Des phases séquentielles. On ne passe pas à la phase suivante
> tant que la précédente n'est pas verte. Phase courante : **J0**.

---

## J0 — Réparer. Le produit devient vrai et autonome.

Constats mesurés (run du 2026-07-14) qui motivent J0 :
- 42 % des enrichissements du run en fallback `null` silencieux
  (149/382 articles en base sans résumé) → rate limit Groq sur le 70B.
- Bug d'écrasement : 173 "nouveaux" par URL → +139 inserts + **34 updates**
  (collision d'`id` via upsert `onConflict:id`).
- 14 articles (RSS perso via `/api/sources`) jamais enrichis/embeddés.
- Aucun cron : ingestion 100 % manuelle. Groq = 90 % des 416 s du run.
- `HUGGINGFACE_API_KEY` absente partout → `/api/search` cassée.
- `PH_API_TOKEN` vide → Product Hunt = 0 article (et CGU non commerciales
  de toute façon, ADR-0006).

### Tâches J0 (dans cet ordre)

**T1 — Modèles Groq en env** *(≈ 30 min)*
`lib/ai.ts` : `GROQ_MODEL_ENRICH` et `GROQ_MODEL_SMART` lus depuis l'env.
ENRICH → un modèle 8B classe "instant" (vérifier la liste sur
console.groq.com au moment de l'implémentation). SMART → llama-3.3-70b.
`briefing`/`ask` utilisent SMART ; `enrich`/`translate` utilisent ENRICH.
Ajouter les 2 variables à `.env`, `.env.local`, `.env.example`.

**T2 — Régime de tokens** *(≈ 1 h)*
- Supprimer la génération VO (`summary_orig`, `key_points_orig`,
  `pullquote_orig`) du prompt d'enrichissement. La VO passe à la demande via
  `/api/translate` (déjà existant). Ne PAS supprimer les colonnes.
- Tronquer l'input d'enrichissement à `ENRICH_INPUT_MAX_CHARS` (défaut 800).
- Cap `MAX_ARTICLES_PER_SOURCE` (défaut 15) appliqué dans `collectAll()`.
- Les 3 valeurs en env avec défauts dans le code.

**T3 — enrich_status : plus jamais de ligne vide** *(≈ 2 h)*
Migration `0011_enrich_status.sql` (fournie dans supabase/migrations/).
- Enrichissement OK → insert avec `enrich_status='ok'`.
- Raté → `enrich_status='pending'`, `enrich_attempts++`, on stocke les
  métadonnées brutes (titre, url, snippet) mais PAS de résumé vide affiché.
- `attempts >= 3` → `'failed'`.
- Le run retente les `pending` EN PRIORITÉ avant de traiter les nouveaux.
- `GET /api/feed` ne sert que `enrich_status='ok'`.
- Backfill : `update articles set enrich_status='pending' where summary is null;`

**T4 — Fix du bug d'écrasement d'id** *(≈ 1 h)*
- `url_canonical` : fonction de normalisation (strip `utm_*`, `fbclid`,
  `ref`, fragment `#…`, trailing slash, host lowercase) + tests unitaires.
- Dédup ET upsert sur l'URL canonique : `onConflict: "url"` (la colonne url
  stocke la forme canonique ; garder l'URL brute dans un champ si besoin).
- Ne plus JAMAIS upserter `onConflict: "id"`.

**T5 — Recherche réparée** *(≈ 15 min + test)*
`HUGGINGFACE_API_KEY` ajoutée partout (fait côté humain). Vérifier que
`embedQuery` cible bien `multilingual-e5-base` (parité stricte avec
l'embedding local). Si HF ne sert plus ce modèle → STOP, en parler à Kylian
(plan B = Edge Function + re-embed, décision humaine).

**T6 — Cron GitHub Actions** *(≈ 1 h)*
Workflow fourni : `.github/workflows/ingest.yml` (toutes les 6 h + manuel).
Secrets GitHub à créer : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
GROQ_API_KEY, HUGGINGFACE_API_KEY, GROQ_MODEL_ENRICH, GROQ_MODEL_SMART.
Bonus : le cron empêche le projet Supabase free de se mettre en pause.

**T7 — Observabilité minimale du pipeline** *(≈ 1 h)*
- `lib/ai.ts` : compter et LOGUER les 429 et les fallbacks (aujourd'hui
  silencieux).
- Fin de run : ligne récap `collectés / nouveaux / enrichis ok / pending /
  failed / 429 / durée`. Le "0 échec" actuel (qui ne compte que les écritures
  DB) disparaît.
- Check de démarrage : variables requises présentes ET non vides
  (`?.trim()`), sinon exit 1. Optionnelles vides → warning.

**T8 — /api/sources enrichit immédiatement** *(≈ 1-2 h)*
Un flux RSS perso ajouté → ses articles passent par enrich + embed dans la
foulée (dans la route, avec cap à 10 articles pour rester sous les timeouts
Vercel). Fix aussi le nommage auto (fallback = hostname si <title> illisible,
cf. "Immobilier : Toute l'actualité…").

**T9 — Sécurité des routes** *(≈ 2 h)*
- Supprimer `/api/summarize` (orpheline).
- `ask`, `briefing`, `translate` : exiger un Bearer token de session
  (`supabase.auth.getUser`), même mécanique que `POST /api/sources`.
- Rate limit simple en mémoire par user (ex. 20 req/min) — pas de nouvelle
  dépendance.
- `GET /api/feed` : dériver l'uid de la session serveur si header présent ;
  le paramètre `?uid=` est ignoré.
- Introduire zod pour valider les corps de requête.

**T10 — UI honnête** *(≈ 2 h)*
- N° d'édition : basé sur les jours d'ingestion réels, ou supprimé.
- "Synchro HH:MM" → "Dernière collecte : il y a Xh" (max(fetched_at)) ou rien.
- Compte à rebours 06:00 → supprimé tant qu'aucun job n'est planifié à 06:00
  (ou aligné sur le cron réel).
- Tendances : si `hasHistory=false`, message explicite "Historique en cours
  de constitution" — plus JAMAIS de fausses valeurs (+47 %…).
- Landing : vrais compteurs via `/api/stats` ou suppression des chiffres.
  Retirer les faux articles/sources en dur.
- `config/brand.ts` : retirer nom réel et "Plan Max" ; compte affiché =
  session Supabase.
- Sélecteur de fréquence de collecte : retiré (reviendra en J1 branché).

**T11 — Smoke tests + CI** *(≈ 2 h)*
- vitest : tests de `url_canonical`, du parsing enrichissement, du gate
  `enrich_status` dans le feed.
- Workflow CI : lint + typecheck + tests sur PR. Merge bloqué si rouge.

### Critères de sortie J0
- [ ] 2 runs cron consécutifs sans intervention, ≥ 95 % `enrich_status='ok'`
- [ ] 0 update parasite (inserts uniquement sur URLs réellement nouvelles)
- [ ] `/api/search` renvoie des résultats en local ET en prod
- [ ] Routes Groq inaccessibles sans session ; `?uid=` inopérant
- [ ] Plus aucun chiffre inventé dans l'UI
- [ ] CI verte obligatoire pour merger

---

## J1 — Le moteur SaaS (schéma v2, une seule migration)
Voir docs/02-schema-v2.md. Multi-tenant (workspaces/memberships) + stories
(clustering) + registre de sources unifié + taxonomie par secteur —
**en une seule passe**, avec `db reset` + ré-ingestion (corpus régénérable,
embeddings de toute façon à reconstruire).
Inclut : calibration des seuils de clustering sur 50 paires labellisées à la
main AVANT d'activer le merge automatique (ADR-0003) ; auto-découverte
"colle une URL" ; réintégration de Hacker News (Algolia) ; 3 sector packs
curatés.

## J2 — Ce qui se vend
`story_questions` générées à l'ingestion · quiz (déblocage à N=5 lectures /
7 jours glissants) · streak/score · dashboard prof (assiduité + scores par
classe) · Stripe.

## J3 — Tenir la charge
`ingest_runs` complet (tokens, coûts, alerting) · quotas par plan ·
ingestion email · changelog "nouveautés" dans le menu · backups
(passage Supabase payant dès les premiers vrais utilisateurs).
