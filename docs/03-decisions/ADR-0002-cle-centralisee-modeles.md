# ADR-0002 — Clé LLM centralisée + deux modèles Groq (pas de BYOK)

**Statut : accepté (2026-07-14)**

## Contexte
Idée initiale : chaque utilisateur fournit sa clé Groq ("créée
automatiquement" ou en < 1 min). Par ailleurs, run du 2026-07-14 :
42 % des enrichissements en fallback null silencieux — rate limit du free
tier Groq sur `llama-3.3-70b-versatile` (173 appels, ~400k tokens/run).
Le code a DÉJÀ deux constantes `GROQ_MODEL_ENRICH` / `GROQ_MODEL_SMART`…
qui pointent toutes deux sur le 70B.

## Options
1. BYOK (clé par utilisateur).
2. Clé centralisée, un seul modèle (70B).
3. **Clé centralisée, deux modèles : 8B pour le volume, 70B pour le rare.**

## Décision
**Option 3.**
- Le BYOK est rejeté définitivement : (a) impossible de créer un compte
  Groq à la place de l'utilisateur (CGU, inscription) ; (b) tueur de
  conversion pour des non-devs ; (c) inacceptable pour une école ;
  (d) incohérent avec l'économie du produit — le coût LLM est par ARTICLE
  (corpus partagé, enrichi une fois), pas par utilisateur.
- `GROQ_MODEL_ENRICH` → modèle 8B classe "instant" (limites free d'un autre
  ordre de grandeur ; classification + résumé 3 phrases = tâche routinière).
- `GROQ_MODEL_SMART` → `llama-3.3-70b-versatile` pour briefing / ask
  (appels rares).
- Les deux modèles sont des **variables d'env**, jamais codés en dur.
- Régime de tokens : plus de génération VO à l'ingestion (traduction à la
  demande via /api/translate), input tronqué à 800 caractères, cap 15
  articles/source/run. Cible : ~400k → ~50k tokens/run.

## Conséquences
- Le produit paie le LLM ; le pricing des plans doit couvrir
  (secteurs × sources × volume), pas le nombre d'utilisateurs.
- Passage au tier payant Groq requis AVANT tout usage commercial
  (vérifier les CGU du free tier à ce moment-là).
- Option "self-host / clé entreprise" envisageable plus tard pour le plan
  entreprise uniquement — jamais le défaut.
- Qualité de résumé 8B à surveiller sur ~30 articles ; si insuffisante,
  tester un modèle intermédiaire avant de revenir au 70B.
