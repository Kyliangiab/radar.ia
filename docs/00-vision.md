# 00 — Vision

> Ce document décrit la cible. L'état réel du code est dans CONTEXT.md.
> En cas de conflit entre les deux : CONTEXT.md décrit ce qui EST,
> ce fichier décrit ce qu'on CONSTRUIT.

## Le problème
La veille est **imposée** dans les cursus (écoles d'ingé, écoles du digital,
BTS/BUT, facs) et **nécessaire** en entreprise — mais personne ne sait la
vérifier. Les profs n'ont aucun moyen de savoir qui a lu, qui a compris.
Les pros croulent sous 12 newsletters non lues.

## Le produit
Radar agrège des sources par **secteur** (Tech, Cyber, Marketing, Santé,
Droit…), croise les articles qui couvrent le **même événement** en une seule
"story" synthétisée par IA (socle commun, exclusivités, divergences entre
sources), et **prouve la lecture** via un quiz généré automatiquement.

## Ce que le produit N'EST PAS
- ❌ Un agrégateur RSS de plus (Feedly existe).
- ❌ Un remplaçant des médias : chaque story renvoie vers les articles
  originaux. On synthétise, on ne substitue pas.
- ❌ Un produit BYOK : la clé LLM est centralisée, le coût est notre problème,
  pas celui de l'utilisateur (ADR-0002).
- ❌ Un produit "20 secteurs day one" : 3 secteurs curatés et excellents
  d'abord.

## Cible commerciale
1. **Tête de pont : les écoles** (prescripteur = prof/responsable pédago).
   Différenciateur : quiz + dashboard prof (assiduité + scores par classe).
   Un contrat = 200-500 étudiants.
2. **Ensuite : les pros**, même moteur, porte d'entrée = ingestion de
   newsletters par email (adresse dédiée par workspace).
3. Étudiants individuels : plan free généreux (acquisition), jamais la
   priorité commerciale.

## Principes économiques
- **Un article est ingéré et enrichi UNE fois**, servi à tous les workspaces
  abonnés à sa source. Le coût LLM croît avec (secteurs × sources × volume),
  PAS avec le nombre d'utilisateurs. Ne jamais céder là-dessus.
- Quiz et synthèses générés **à l'ingestion**, stockés → coût marginal par
  utilisateur ≈ 0.
- Sources par défaut : gratuites, publiques, sans restriction commerciale
  (ADR-0006).

## Différenciateurs (par ordre)
1. **Stories** : croisement multi-sources d'un même événement, avec
   divergences citées (ADR-0003). Personne ne fait ça.
2. **Preuve de lecture** : quiz sur articles réellement lus + dashboard prof.
3. **Sources sans friction** : "colle une URL" avec auto-découverte
   (RSS, YouTube, Reddit, GitHub, Substack, scrape) + ingestion email.
   L'utilisateur ne choisit jamais un "type" de source.
4. Bilingue FR/EN natif (embeddings multilingues, résumés FR).

## Signal de pertinence
`source_count` (nombre de sources indépendantes couvrant un événement en 48h)
remplace le `heat` heuristique à terme. Robuste, non manipulable, valable
dans tous les secteurs (pas besoin d'upvotes).
