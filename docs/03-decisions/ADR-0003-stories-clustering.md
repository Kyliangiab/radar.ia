# ADR-0003 — Clustering d'événements en "stories" (synthèse croisée)

**Statut : accepté (2026-07-14) — implémentation en J1**

## Contexte
Plusieurs sources couvrent le même événement (ex. sortie d'un modèle IA)
→ le feed affiche N cartes redondantes. Le dédoublonnage actuel (par URL)
n'attrape que les republications exactes, pas la couverture croisée.
L'infra vectorielle existe déjà (pgvector 768, HNSW cosinus).

## Options
1. Ne rien faire (dédup URL seule).
2. Clustering batch a posteriori (recalcul complet périodique).
3. **Clustering incrémental à l'ingestion + synthèse croisée par LLM.**

## Décision
**Option 3.** Chaque article, après enrichissement + embedding :
1. Candidats = stories du même secteur, `last_seen_at > now()-7j`,
   top-5 par distance cosinus au centroïde.
2. Gate à DOUBLE signal (le cosinus seul sur-merge, plancher e5 très haut) :
   - `sim > τ_high` → merge direct ;
   - `τ_low < sim ≤ τ_high` **ET** ≥ 1 entité nommée commune → vérification
     LLM binaire (~200 tokens, modèle ENRICH) ;
   - sinon → nouvelle story.
3. **τ calibrés, jamais devinés** : 50 paires d'articles labellisées à la
   main, distribution des similarités, choix des seuils au point de
   séparation. Attendu ~0.92–0.95 pour τ_high, à vérifier.
4. Le prompt d'enrichissement ajoute `entities: string[]` (produits,
   entreprises, personnes, versions) — coût marginal nul.
5. Synthèse croisée (JSON) : `fait_etabli` (rapporté par toutes les
   sources), `exclusivites` (une seule source, nommée), `divergences`
   (contradictions, chaque version sourcée — tableau vide si aucune,
   interdiction d'en inventer), `angles` (spécificité de chaque source),
   `key_points`.
6. Coûts : max 1 synthèse/story/run ; régénération seulement si
   `article_count >= synth_count + palier` (1,2,3,5,8,13,21).
7. `source_count` (sources distinctes en 48 h) devient le signal de
   pertinence — remplace le `heat` heuristique.
8. Les articles membres restent consultables dans la story (liste
   dépliable + lien vers l'original) : traçabilité pédagogique + on
   renvoie vers les médias, on ne les remplace pas.

## Conséquences
- Le feed, les lectures, les favoris et le quiz passent au niveau story.
- Le slot UI "Aussi couvert par" (actuellement faux voisinage "même
  domaine") est rebranché sur les vrais membres de la story.
- Dépend du schéma v2 (docs/02-schema-v2.md) → J1, pas avant.
- Si le taux de faux merges observé > ~2 %, resserrer τ_high avant de
  toucher à autre chose.
