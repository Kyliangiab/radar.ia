# Justification des sources — Radar

La veille couvre **4 domaines** (Tech · Business · Data & IA · UX & Design) via un
mélange de **RSS** et d'**API**, agrégées par le pipeline d'ingestion
(`scripts/ingest.ts`), dédoublonnées par URL, puis **reclassées et résumées par
l'IA** (Groq). Le `defaultCategory` d'un flux n'est qu'un fallback de tri : c'est
l'enrichissement qui affecte le domaine final de chaque article.

> ⚠️ Les sources RSS/API additionnelles ne tournent **que** dans le pipeline
> (Node), jamais dans une route serverless (parsing lourd / bloquant).

## Tableau des sources

| Source | Type | Domaine visé | URL / Endpoint | Autorité & indépendance | Angle | Limites |
|---|---|---|---|---|---|---|
| **Hacker News** | API (Algolia) | Tech / Data | `hn.algolia.com/api/v1/search` | Communauté tech de référence (Y Combinator), signal fort par upvotes | Ce que lisent les ingénieurs ; front page + recherche par mot-clé | Anglophone, biais SF/startups, titres parfois sans description |
| **Dev.to** | API | Tech / UX | `dev.to/api/articles` | Plateforme communautaire de développeurs | Contenu pratique, tutoriels, retours d'expérience | Qualité variable (auto-publication) |
| **TechCrunch** | RSS (full-text) | Business | `techcrunch.com/feed/` | Média tech majeur, rédaction pro | Financement, startups, marché, produits | Anglophone, angle très « industrie US » |
| **TechCrunch AI** | RSS | Data & IA | `techcrunch.com/category/artificial-intelligence/feed/` | idem, rubrique dédiée IA | Actualité IA business & produits | Recoupe parfois le flux principal |
| **The Verge** | RSS (extraits) | Tech | `theverge.com/rss/index.xml` | Média grand public tech, indépendant | Produits, culture tech, hardware | Extraits courts (pas de full-text), généraliste |
| **VentureBeat** | RSS | Data & IA | `venturebeat.com/feed/` | Média tech orienté entreprise/IA | IA appliquée, enterprise, data | Anglophone, ton parfois promotionnel |
| **Smashing Magazine** | RSS | UX & Design | `smashingmagazine.com/feed/` | Référence historique du design/dev front | UX, design système, accessibilité, CSS | Rythme de publication plus lent |
| **Le Monde — Pixels** | RSS (full-text) | Tech | `lemonde.fr/pixels/rss_full.xml` | Presse française de référence, indépendante | Regard FR/EU sur le numérique, société | Généraliste, parfois moins « pointu » technique |
| **Le Monde — IA** | RSS (full-text) | Data & IA | `lemonde.fr/intelligence-artificielle/rss_full.xml` | idem, rubrique IA | IA sous l'angle société/régulation FR/EU | Volume plus faible |
| **Product Hunt** | API (GraphQL V2) | Tech | `api.producthunt.com/v2/api/graphql` | Vitrine des lancements produits | Nouveaux produits/outils, votés par la commu | Nécessite `PH_API_TOKEN` ; pas de recherche plein-texte (posts récents les + votés) |
| **NewsAPI** *(optionnel)* | API | Tech | `newsapi.org/v2/top-headlines` | Agrégateur multi-médias | Top headlines tech FR | Plan gratuit **localhost/dev only**, 100 req/j, non commercial → désactivé par défaut (`NEWSAPI_KEY` vide) |

## Couverture des 4 domaines

- **Tech** : HN, Dev.to, The Verge, Le Monde Pixels, Product Hunt
- **Business** : TechCrunch
- **Data & IA** : TechCrunch AI, VentureBeat, Le Monde IA, HN (requête « AI »)
- **UX & Design** : Smashing Magazine, Dev.to (tags design/ux)

## Équilibre & indépendance

- **Mix RSS + API** : 7 flux RSS + 3 API (HN, Dev.to, Product Hunt) → l'exigence
  « 4 à 6 sources, RSS + au moins une API » est largement couverte.
- **Diversité éditoriale** : communautaire (HN, Dev.to, Product Hunt), presse pro
  (TechCrunch, VentureBeat), presse généraliste indépendante (Le Monde, The Verge),
  spécialisé métier (Smashing).
- **Équilibre linguistique** : sources FR (Le Monde) + EN, pertinent grâce aux
  embeddings multilingues (`multilingual-e5-small`, FR↔EN) et au résumé FR par l'IA.
- **Anti-mono-source** : dédoublonnage par URL normalisée + `heat` relatif, pour
  qu'aucune source ne domine mécaniquement le classement.

## Extension

Ajouter une source RSS = une ligne dans [`lib/feeds.ts`](../lib/feeds.ts). Ajouter
une API = une fonction `fetchX()` dans [`lib/sources.ts`](../lib/sources.ts) puis la
brancher dans `collectExtraSources()`.
