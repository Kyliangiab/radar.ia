# ADR-0006 — Politique de sources : gratuites, publiques, compatibles commercial

**Statut : accepté (2026-07-14)**

## Contexte
Produit destiné à la vente (écoles, entreprises). Or deux sources
configurées ont des CGU incompatibles : l'API Product Hunt est interdite
d'usage commercial par défaut (contact requis), NewsAPI free est
localhost/non-commercial. PH avait de toute façon un token vide → 0 article
collecté. Par ailleurs Hacker News (API Algolia : gratuite, sans clé, sans
restriction équivalente, signal d'upvotes, requêtable par mot-clé donc
multi-secteur) a été retirée en migration 0006.

## Décision
1. **Critères d'éligibilité d'une source par défaut** (packs curatés) :
   (a) accès gratuit et stable, (b) sans clé/credential si possible,
   (c) CGU compatibles avec un usage commercial, (d) valeur réelle pour le
   secteur visé.
2. `ph` et `newsapi` → `active=false`. Ne pas réactiver sans accord écrit
   des plateformes. Adapters conservés (suppression lors de la refonte du
   registre en J1).
3. **Hacker News (Algolia) sera réintégrée en J1** avec les sector packs :
   requêtes par mot-clé par secteur (ex. `security`, `fintech`).
4. Les sources ajoutées par les utilisateurs (RSS perso, plus tard email)
   relèvent de leur responsabilité d'usage ; le produit n'en fait pas des
   sources par défaut.

## Conséquences
- 8 sources actives (toutes RSS/API publiques sans credential côté
  ingestion). Dev.to reste la plus volumineuse → cap 15 articles/source
  (ADR-0002) pour l'empêcher de dominer.
- Toute nouvelle source par défaut passe par la checklist (a)-(d) et une
  ligne de justification dans SOURCES.md.
