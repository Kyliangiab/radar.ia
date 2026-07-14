# ADR-0001 — Ingestion via GitHub Actions (worker cron)

**Statut : accepté (2026-07-14)**

## Contexte
L'ingestion (`npm run ingest`) est 100 % manuelle. Le README promettait un
cron GitHub Actions qui n'a jamais existé. L'embedding documents utilise un
modèle ONNX local trop lourd pour le serverless Vercel (cold start de
plusieurs minutes). Sans automatisation : feed figé, tendances vides,
projet Supabase free menacé de mise en pause (~7 j d'inactivité).
Mesure du 2026-07-14 : run complet ≈ 7 min, dont 90 % = appels Groq,
embedding local = 31 s seulement (marginal).

## Options
1. **GitHub Actions cron** — gratuit (2000 min/mois repo privé, illimité
   public), environnement Node complet (ONNX OK), aucun serveur à gérer.
2. Worker long-running (Railway/Fly/Render) — plus flexible (expose /embed),
   mais service à payer/surveiller ; surdimensionné au stade actuel.
3. Vercel Cron + Edge Functions — impose de déporter l'embedding (re-embed
   complet en 384 dims) ; contrainte de timeout.

## Décision
**Option 1.** Cron toutes les 6 h + déclenchement manuel
(`workflow_dispatch`). Budget : ~4 runs/jour × ~2 min (post-optimisation
tokens) ≈ 240 min/mois → largement sous la limite gratuite.
L'embedding de requête (recherche) reste sur HF Inference
(`HUGGINGFACE_API_KEY`), même modèle `multilingual-e5-base` que l'embedding
local — parité de modèle obligatoire.

## Conséquences
- Secrets à dupliquer dans GitHub (Settings → Secrets → Actions).
- Le cron maintient Supabase free éveillé (effet de bord bienvenu).
- Migration future vers un worker dédié (option 2) possible sans changement
  de code pipeline si le besoin /embed serveur apparaît.
- Révision si : durée de run > 10 min, ou besoin d'ingestion < 1 h de
  latence, ou volume mensuel approchant la limite gratuite.
