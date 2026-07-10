# Déploiement sur Vercel

Le code est prêt (le build passe : `npm run build`). Il reste **une étape qui exige
ta connexion Vercel** (login navigateur ou token) — impossible à faire à ta place.
Voici les deux chemins possibles.

## Option A — Import GitHub (recommandé, zéro CLI)

1. Va sur https://vercel.com/new → **Import** le repo `Kyliangiab/radar.ia`.
2. Framework détecté : **Next.js** (rien à changer).
3. Ajoute les **variables d'environnement** (valeurs dans ton `.env.local`) :

   | Variable | Portée | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Build + Runtime | inlinée au build → obligatoire avant build |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build + Runtime | idem |
   | `SUPABASE_URL` | Runtime | routes API / SSR |
   | `SUPABASE_SERVICE_ROLE_KEY` | Runtime | **secret** — routes API uniquement |
   | `GROQ_API_KEY` | Runtime | brief / résumés / Ask Radar |

4. **Deploy**. Vercel build + met en ligne.

## Option B — CLI (si tu préfères)

```bash
npx vercel login          # une fois (navigateur / email)
npx vercel link           # lie le dossier au projet
npx vercel env add ...    # les 5 variables ci-dessus
npx vercel --prod         # déploiement production
```

> Ou fournis-moi un `VERCEL_TOKEN` (Account → Settings → Tokens) et je lance
> `vercel --prod --token …` moi-même.

## Après le premier déploiement — Auth Google

L'app appelle `signInWithOAuth({ redirectTo: window.location.origin })`. Il faut
donc autoriser le domaine Vercel côté Supabase, sinon le login casse en prod :

- **Supabase → Authentication → URL Configuration**
  - **Site URL** : `https://<ton-projet>.vercel.app`
  - **Redirect URLs** : ajoute `https://<ton-projet>.vercel.app/**`
    (et les domaines de preview `https://*-<team>.vercel.app/**` si besoin).
- Vérifie que le **Google provider** est activé (Client ID / Secret déjà configurés).

## Ingestion (important)

`npm run ingest` fait tourne un modèle d'embedding **local** (onnx / transformers)
+ appelle Groq. Ce n'est **pas** fait pour tourner sur une fonction serverless
Vercel (poids du modèle, mémoire, durée). Garde l'ingestion :

- en local (`npm run ingest`), ou
- sur une machine / un cron dédié (VPS, GitHub Actions self-hosted, etc.).

Le **snapshot de volume** (`daily_topic_volume`) s'écrit à chaque ingestion : lance-la
quotidiennement pour que les vraies variations des Tendances se remplissent.

## Checklist post-déploiement

- [ ] Login Google fonctionne sur le domaine prod
- [ ] Le fil se charge (route `/api/feed`)
- [ ] Brief du jour se génère (route `/api/briefing`, clé Groq OK)
- [ ] Recherche sémantique (route `/api/search`)
- [ ] Ask Radar répond (route `/api/ask`)
