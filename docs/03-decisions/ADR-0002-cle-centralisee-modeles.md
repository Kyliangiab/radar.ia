# ADR-0002 — Clé LLM centralisée + deux modèles Groq (pas de BYOK)

**Statut : accepté (2026-07-14)**

## Contexte
Idée initiale : chaque utilisateur fournit sa clé Groq. Par ailleurs, run du
2026-07-14 : 42 % des enrichissements en fallback null silencieux.

**Cause racine mesurée :** ~400 000 tokens poussés en 6,2 min ≈ **64k TPM**,
contre une limite free tier Groq de l'ordre de **30k TPM**. Le taux d'échec
observé (42 %) correspond à l'arithmétique. Ce n'est pas un bug, c'est un
dépassement de quota.

**Aggravant :** `llama-3.3-70b-versatile` (le modèle utilisé aujourd'hui) et
`llama-3.1-8b-instant` ont été **dépréciés par Groq le 17 juin 2026**.
Migrations officielles : `openai/gpt-oss-20b` (remplace le 8B) et
`openai/gpt-oss-120b` (remplace le 70B). Le code a par ailleurs DÉJÀ deux
constantes `GROQ_MODEL_ENRICH` / `GROQ_MODEL_SMART`… qui pointent toutes deux
sur le 70B déprécié.

## Options
1. BYOK (clé par utilisateur).
2. Clé centralisée, un seul modèle.
3. **Clé centralisée, deux modèles + régime de tokens.**

## Décision
**Option 3.**

### Rejet définitif du BYOK
(a) Impossible de créer un compte Groq à la place de l'utilisateur (CGU,
inscription) — le "automatique" demandé est irréalisable.
(b) Tueur de conversion pour des non-devs.
(c) Inacceptable pour une école (300 étudiants x compte tiers).
(d) **Incohérent avec l'économie du produit** : le coût LLM est par ARTICLE
(corpus partagé, enrichi une fois), pas par utilisateur.
-> Option "self-host / clé entreprise" envisageable plus tard pour le plan
entreprise uniquement. Jamais le défaut.

### Modèles (variables d'env, JAMAIS codés en dur)
| Variable | Valeur | Usage |
|---|---|---|
| `GROQ_MODEL_ENRICH` | `openai/gpt-oss-20b` | enrich, translate (volume) |
| `GROQ_MODEL_SMART` | `openai/gpt-oss-120b` | briefing, ask (rare) |

Vérifier la disponibilité sur console.groq.com/docs/models avant de figer :
le lineup Groq bouge vite. Ne jamais dépendre d'un modèle marqué "preview".

### Régime de tokens (indispensable — le changement de modèle ne suffit pas)
- Suppression de la génération VO à l'ingestion (`summary_orig`,
  `key_points_orig`, `pullquote_orig`) -> traduction à la demande via
  `/api/translate`. **-50 % de tokens de sortie.**
- `ENRICH_INPUT_MAX_CHARS=800` (troncature avant envoi).
- `MAX_ARTICLES_PER_SOURCE=15` (Dev.to = 97/173 du dernier run).
- Cible : ~400k -> ~50k tokens/run, très en dessous des 30k TPM.
- `ENRICH_CONCURRENCY` : à réduire si les 429 persistent (instrumenté en T7).

## Conséquences
- Le produit paie le LLM. Le pricing doit couvrir
  (secteurs x sources x volume), pas le nombre d'utilisateurs.
- Passage au tier payant Groq requis AVANT tout usage commercial (vérifier
  les CGU du free tier à ce moment-là).
- Qualité de résumé `gpt-oss-20b` à valider sur ~30 articles. Si
  insuffisante : escalade vers `gpt-oss-120b` pour l'enrichissement, pas
  retour au Llama déprécié.
- `lib/ai.ts` doit rester agnostique du fournisseur : aucun couplage dur à
  Groq au-delà de la base URL (les dépréciations vont se répéter).
