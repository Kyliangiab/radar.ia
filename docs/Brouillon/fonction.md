# Fonctionnalités — Radar

> Inventaire des fonctionnalités **réellement présentes** dans l'app (état au
> 2026-07-14), telles qu'implémentées dans le code. Statuts :
> ✅ fonctionnel · ⚠️ dégradé/cassé · 🎭 illustratif (UI présente mais non câblée
> à une vraie logique) · 🤖 utilise l'IA (Groq).

## 1. Authentification & compte

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Connexion Google (OAuth) | ✅ | `signInWithOAuth({ provider: "google" })`, redirect vers l'origine. |
| Connexion email + mot de passe | ✅ | `signInWithPassword`. |
| Lien magique (OTP email) | ✅ | `signInWithOtp`. |
| Écran d'auth éditorial | ✅ | Panneau gauche animé + formulaire. Affiche des données **réelles** (`/api/stats`) : nombre d'articles analysés, dernier titre (hero), 3 domaines les plus actifs. Repli illustratif si base vide. |
| Bascule langue FR/EN de l'écran d'auth | ✅ 🤖 | Traduit les textes via `/api/translate`. |
| Déconnexion | ✅ | Menu compte dans la sidebar. |
| Cloisonnement par utilisateur | ✅ | Favoris, lus, sources perso et préférences sont isolés par RLS (`auth.uid()`). |

## 2. Fil de veille (« Pour toi » / feed)

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Affichage du fil | ✅ | Source de vérité = base (`/api/feed`). Corpus global + articles des sources perso du user. |
| Repli « live » sans base | ⚠️ | `getFeed()` n'interroge que **Dev.to** (mono-source, dégradé). |
| Filtre par domaine | ✅ | Tout · Tech · Business · Data & IA · UX & Design (sidebar). |
| Tri | ✅ | « Pour toi » → par `heat` (hot) ; « Récents » → par date. (Automatique selon la vue, pas de sélecteur manuel.) |
| Densité d'affichage | ✅ | Confort (grille de cartes) / Compact (liste dense). |
| Carte article | ✅ | Badge domaine, pastille de pertinence (heat → Faible/Moyen/Haute/On Fire), résumé Radar, source, ancienneté, image, bouton enregistrer. |
| Marqueur « lu » | ✅ | Article ouvert = estompé + badge ✓ Lu, persisté en base (`article_reads`). |
| Enregistrer / retirer (favori) | ✅ | Toggle bookmark, persisté (`saved`). Badge de compteur dans la sidebar. |
| États vides / skeletons | ✅ | Squelettes au chargement + messages d'état par vue. |

## 3. Volet article (drawer)

Ouvert au clic sur une carte. **Aucun appel IA à l'ouverture** — tout le contenu
enrichi est lu depuis la base (généré à l'ingestion).

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Résumé Radar | ✅ | Texte pré-généré. Toggle **Court / Résumé**. |
| Bascule FR / VO | ✅ | Résumé, points et punchline stockés en 2 langues ; VO proposée si le titre n'est pas en français. |
| Points à retenir | ✅ | 3 points clés (anti-répétition avec le résumé). |
| « À ressortir en réunion » | ✅ | Punchline mise en avant. |
| Aussi couvert par | ✅ | Jusqu'à 3 articles liés (même domaine). |
| Ask Radar | ✅ 🤖 | Poser une question libre sur l'article → `/api/ask`. Puces suggérées (Impact équipe, Chiffres clés, Concurrents). |
| Enregistrer | ✅ | Toggle favori. |
| Partager | ✅ | Web Share API natif, repli copie du lien. |
| Lire sur la source | ✅ | Lien externe (nouvel onglet). |
| Ergonomie | ✅ | Fermeture par Échap, clic backdrop, swipe (mobile), animations d'entrée/sortie. |

## 4. Recherche

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Recherche sémantique | ⚠️ 🤖 | Barre unique (Topbar), raccourci **⌘K**. `/api/search` : embedding de la requête (HF) → RPC `match_articles` (cosinus, top 24). **Actuellement cassée** : la clé `HUGGINGFACE_API_KEY` manque → renvoie une erreur, message « La recherche a échoué ». |
| Effacer / Échap | ✅ | Réinitialise et revient au fil. |
| Message si base absente | ✅ | « Configure Supabase pour activer la recherche. » |

## 5. Brief du jour

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Bannière de brief (haut du fil) | ✅ 🤖 | `BriefBanner` : headline + 3 tendances. |
| Vue Brief complète | ✅ 🤖 | `BriefView` : généré via `/api/briefing` à partir des titres phares du jour → headline, 3-4 tendances (titre + pourquoi), signal à surveiller. |
| Signaux faibles | ✅ | Le `watch` de l'IA + 2 signaux dérivés du flux réel. |
| Partager le brief | ✅ | Copier le texte, envoyer par email, imprimer (`copyText`, `emailBrief`, `printBrief`). |

## 6. Tendances

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Variations de volume par domaine | ✅ | `/api/stats` compare les 7 derniers jours aux 7 précédents à partir de `daily_topic_volume`. |
| Sujets qui montent / qui baissent | ✅ | Classés par variation réelle. |
| Sparkline 7 jours | ✅ | Tracé SVG du volume. |
| Repli illustratif | 🎭 | Tant qu'il y a moins de 2 jours de snapshots (`hasHistory=false`), affiche des valeurs d'exemple (ex. « +47 % », agents autonomes/edge). |
| Sélecteur de période / « Comparer avec » | 🎭 | Boutons « Il y a un mois / 3 mois », « 1 j / 7 j / 30 j » présents mais non câblés (pas de requête derrière). |

## 7. Sources

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Liste des sources globales actives | ✅ | `GET /api/sources`. |
| Ajouter un flux RSS perso | ✅ | `POST /api/sources` (authentifié Bearer) : valide l'URL, récupère le nom auto du flux, collecte ses articles récents (bruts, enrichis plus tard par l'ingestion). |
| Mettre en pause / réactiver | ✅ | Persisté par utilisateur (`user_source_prefs.paused`). |
| Archiver / restaurer | ✅ | « Retirer » = archive **restaurable 72 h** (`removed`), purge définitive au-delà. |
| Filtres | ✅ | Toutes / Actives / En pause / Archivées. |
| Sélecteur de fréquence de collecte | 🎭 | « Toutes les heures… » affiche un toast mais ne planifie rien (l'ingestion est manuelle). |
| Guide de collecte | 🎭 | Conseils statiques dans le rail droit. |

## 8. Notifications

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Cloche + panneau | ✅ | Topbar. Notifications **dérivées de vraies données** (`buildNotifications`) : brief prêt, sujet en accélération, sujet dominant, source prolifique, fiches enregistrées. |
| État « lu / non lu » | ✅ | Persisté en `localStorage` (badge de non-lus). |
| « Notifié 5 min avant chaque brief » | 🎭 | Libellé indicatif, aucun envoi de notification réel (pas de push). |

## 9. Interface & confort

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Thème clair / sombre | ✅ | `ThemeToggle`, couleurs theme-aware. |
| Rail droit « ambient » | ✅/🎭 | Adapté à la vue : compte à rebours du prochain brief (06:00, calcul réel) ; statut de collecte (nb de sources) ; aperçu 7 j. Contenu volontairement d'ambiance (radar animé, citations). |
| Indicateur « Synchro · HH:MM » | 🎭 | Affiche l'heure courante, ne reflète pas une vraie synchro live. |
| Libellé d'édition daté | ✅ | « Éd. JJ.MM · Nº N », N incrémente d'un par jour depuis le 04/01/2026. |
| Toasts | ✅ | Retours d'action (enregistré, source en pause, lien copié…). |
| Responsive / mobile | ✅ | Menu burger, sidebar rétractable, swipe drawer. |
| Traduction FR de textes | ✅ 🤖 | `/api/translate` (repli = texte original si Groq indispo). |
| Landing publique (`/`) | 🎭 | Page marketing statique. **Chiffres et articles codés en dur** (« 86 sources », faux titres/sources) — ne reflète pas l'état réel (9 sources actives). |

## 10. Pipeline (back-office, hors UI)

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Ingestion multi-sources | ✅ | `npm run ingest` : collecte 9 sources actives (Dev.to, 6 RSS, Product Hunt ; NewsAPI désactivé), dédoublonne par URL, calcule un `heat` global. |
| Enrichissement IA | ✅ 🤖 | Par article neuf : classification en domaine + résumé + 3 points + punchline (FR **et** langue d'origine) via Groq (`llama-3.3-70b`). |
| Vectorisation | ✅ | Embedding local `multilingual-e5-base` (768 dims), stocké dans `article_embeddings`. |
| Snapshot de volume | ✅ | Compte quotidien par domaine → `daily_topic_volume` (alimente les Tendances). |
| Planification automatique | ⚠️ | **Aucun cron en place.** Le README annonce un GitHub Actions toutes les 6 h qui **n'existe pas** → l'ingestion est 100 % manuelle. |
| Backfill résumé VO | ✅ | Script ponctuel `npm run backfill:orig`. |

## Récapitulatif des fonctionnalités IA (Groq)

- 🤖 **Enrichissement** (ingestion) — classe + résume chaque article.
- 🤖 **Briefing du jour** — synthèse éditoriale des titres phares.
- 🤖 **Ask Radar** — Q/R sur un article.
- 🤖 **Traduction** — textes UI / écran d'auth en français.
- 🤖 **Résumé à la demande** (`/api/summarize`) — route existante mais **non
  appelée par le front** (le drawer lit les résumés stockés depuis la migration 0010).

## Limites transversales connues

1. **Recherche sémantique hors service** (clé HF absente).
2. **Ingestion manuelle** (pas de cron) → fil et tendances se figent sans lancement.
3. **Routes IA publiques sans rate limit** (briefing, ask, translate).
4. **Landing entièrement mockée** vs. réalité produit.
5. Plusieurs éléments UI 🎭 (fréquence de collecte, comparaison de périodes,
   « notifié 5 min avant », indicateur de synchro) sont décoratifs, pas câblés.

> Détails techniques : voir [CONTEXT.md](CONTEXT.md) (architecture, endpoints,
> dette) et [DB.md](DB.md) (schéma de la base).
