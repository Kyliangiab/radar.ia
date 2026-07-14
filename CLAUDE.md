# Radar — Veille techno (SaaS en construction)

## Contexte obligatoire
Avant toute décision d'architecture ou de schéma, lis :
- @docs/00-vision.md — ce que le produit est et n'est PAS
- @docs/01-plan.md — l'ordre de bataille (phase courante : **J0**)
- @docs/03-decisions/ — les décisions actées (ADR). **Ne les contredis pas.**
  Si tu penses qu'une décision est mauvaise, dis-le explicitement dans ta
  réponse, ne la contourne pas en silence.

État réel du code : @docs/CONTEXT.md · schéma DB : @docs/DB.md ·
inventaire UI : @docs/fonction.md (⚠️ ✅ = "le code existe", pas "ça marche").

## Phase courante : J0 — réparer, pas refondre
- **INTERDIT en J0** : refonte du schéma, multi-tenant, clustering en stories,
  quiz, Stripe. Ces chantiers sont définis (ADR-0003, ADR-0004) mais démarrent
  en J1 seulement, sur ordre explicite de Kylian.
- Seule migration autorisée en J0 : `0011_enrich_status.sql` (+ éventuel
  `update sources set active=false where id='ph'`).
- En J0 on répare le pipeline existant et on rend l'UI honnête. Point.

## Commandes
- dev : `npm run dev`
- ingestion : `npm run ingest`
- backfill VO : `npm run backfill:orig`
- migrations : `supabase db push` (prod) / `supabase db reset` (local)

## Règles dures
1. **Aucun article sans enrichissement ne doit être servi au feed.**
   `enrich_status='ok'` est la seule porte d'entrée du feed (ADR-0005).
2. **Jamais de ligne vide en base** : un enrichissement raté = `pending` +
   `enrich_attempts++`, pas un insert avec `summary=null`.
3. **Modèles Groq** : lus depuis `GROQ_MODEL_ENRICH` / `GROQ_MODEL_SMART`
   (env), jamais codés en dur. ENRICH = modèle 8B "instant", SMART = 70B
   (ADR-0002).
4. **Clé LLM centralisée** : jamais de BYOK utilisateur (ADR-0002).
5. **Dédoublonnage par `url_canonical`** (strip utm_*, fbclid, ref, fragment,
   trailing slash, host en minuscules). L'upsert se fait `onConflict: url`,
   jamais `onConflict: id` (bug d'écrasement documenté, cf. 01-plan.md T4).
6. **Pas de nouvelle dépendance** sans justification écrite dans la PR.
7. **Secrets** : jamais en dur, jamais dans un commit. Toute nouvelle variable
   d'env est ajoutée à `.env.example` (valeur vide + commentaire) ET au check
   de démarrage de `scripts/ingest.ts`.
8. **UI honnête** : aucun chiffre, compteur, horodatage ou libellé qui ne
   reflète pas une donnée réelle. Un indicateur qui ne peut pas dire la vérité
   dit "—" ou disparaît.
9. Sources `ph` et `newsapi` : `active=false`, ne pas réactiver
   (CGU non commerciales, ADR-0006). Ne pas supprimer les adapters.
10. Réponses/commentaires de code en **français**.

## Style de code
- TypeScript strict, pas de nouveau `: any` (en réduire le stock ~9 existant
  quand on touche un fichier).
- Validation des corps de requête API : zod (à introduire en J0-T9).
- Toute décision structurante → nouvel ADR dans `docs/03-decisions/`,
  format : Contexte / Options / Décision / Conséquences.

## Fin de session
Mets à jour `docs/04-journal.md` : fait / en cours / bloqué / prochaine étape.
