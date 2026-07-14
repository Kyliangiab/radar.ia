/**
 * Pipeline d'ingestion — LA commande qui auto-alimente la plateforme.
 *   npm run ingest
 * Étapes : collecte (sources actives en DB, large) → dédoublonnage → enrichissement
 * IA concurrent (domaine + résumé + pourquoi) → embedding local (e5-base) → upsert
 * (articles + article_embeddings).
 *
 * Nécessite Supabase configuré (on ingère DANS la base). Sans clé Groq :
 * la classification retombe sur la catégorie d'origine de la source.
 */
import { config } from "dotenv";
config({ path: ".env.local" }); // même fichier que l'app Next
config(); // repli sur .env si présent (n'écrase pas)
import { collectAll } from "../lib/sources";
import { enrich } from "../lib/enrich";
import { embedDocument } from "../lib/embeddings";
import { getSupabase } from "../lib/supabase";
import { getAiStats, resetAiStats } from "../lib/ai";
import type { Article, CategoryId } from "../lib/types";

// Appels Groq en parallèle (réseau). Réglable en env (défaut 5) ; le tuning
// effectif + l'instrumentation des 429 relèvent de T7 (ADR-0002).
const ENRICH_CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY) || 5;

// Plafond du backlog de retry par run (ADR-0005 révisé). La Phase A ne retente
// que les N plus anciens `pending` → le backlog se draine sur plusieurs runs au
// lieu de saturer le rate limit Groq d'un seul coup.
const MAX_RETRY_PER_RUN = Number(process.env.MAX_RETRY_PER_RUN) || 30;

// map concurrent borné, sans dépendance.
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ── Machine à états d'enrichissement (ADR-0005) ──
// Un enrichissement raté ne produit JAMAIS de ligne "vide et servie" : la ligne
// reste `pending` (métadonnées brutes conservées) et `enrich_attempts` grimpe ;
// à 3 tentatives elle passe `failed` (on arrête de payer). Seul `ok` est servi.
type EnrichStatus = "ok" | "pending" | "failed";

async function enrichOutcome(a: Article, priorAttempts: number) {
  const e = await enrich(a);
  const ok = !!e.summary?.trim();
  // ADR-0005 (révisé) : un 429 = surcharge de charge, PAS la faute de l'article.
  // On ne consomme une tentative que pour les échecs imputables au contenu/à
  // l'API (parse / http / clé absente). Sinon un pic de charge condamnerait
  // définitivement des articles valides (c'est ce qui est arrivé aux 4 failed).
  const consumesAttempt = !ok && e.failReason !== "rate429";
  const attempts = consumesAttempt ? priorAttempts + 1 : priorAttempts;
  const status: EnrichStatus = ok ? "ok" : attempts >= 3 ? "failed" : "pending";
  return { e, ok, attempts, status };
}

// Ligne DB `articles` → forme Article (pour ré-enrichir les `pending`).
function rowToArticle(r: any): Article {
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    author: r.author ?? undefined,
    points: r.points ?? 0,
    comments: r.comments ?? 0,
    publishedAt: r.published_at,
    category: (r.category ?? "tech") as CategoryId,
    tags: r.tags ?? [],
    snippet: r.snippet ?? undefined,
    image: r.image ?? undefined,
    heat: r.heat ?? 0,
  };
}

// Check de démarrage (T7) : un secret requis manquant doit échouer À LA
// SECONDE 0 avec un message net — pas planter obscurément 3 min plus tard.
// Les optionnelles vides retombent sur les défauts du code (simple warning).
function checkEnv(): void {
  // Requises : sans elles, le run n'a aucun sens (DB + enrichissement).
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GROQ_API_KEY"];
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    console.error(`✗ Variables requises manquantes ou vides : ${missing.join(", ")}.`);
    console.error(
      "  En CI : Settings → Secrets and variables → Actions. En local : .env / .env.local.",
    );
    process.exit(1);
  }
  // Optionnelles à défaut code : on signale qu'on utilise le défaut.
  const withDefault: Array<[string, string]> = [
    ["GROQ_MODEL_ENRICH", "openai/gpt-oss-20b"],
    ["GROQ_MODEL_SMART", "openai/gpt-oss-120b"],
  ];
  for (const [k, def] of withDefault) {
    if (!process.env[k]?.trim()) console.warn(`⚠ ${k} vide → défaut code « ${def} ».`);
  }
}

async function main() {
  checkEnv();

  const supabase = getSupabase();
  if (!supabase) {
    console.error("✗ Supabase non configuré (SUPABASE_URL / SERVICE_ROLE_KEY). Rien à ingérer.");
    process.exit(1);
  }

  resetAiStats(); // compteurs Groq de ce run (429 / http_err / parse_err)

  console.log("→ Collecte des sources actives…");
  const articles = await collectAll();

  // Compte par source (visibilité)
  const bySource = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.source] = (acc[a.source] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    "Par source : " +
      Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `${s}=${n}`)
        .join("  "),
  );
  console.log(`Collectés : ${articles.length} articles uniques`);

  // Compteurs de run (récap ADR-0005). Le comptage 429 / durée est T7.
  let okCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let storeErr = 0;

  // Calcule + stocke l'embedding d'un article (SÉQUENTIEL : le runtime onnx
  // n'est pas réentrant). N'est appelé que pour les articles `ok`.
  async function embedAndStore(a: Article): Promise<void> {
    const embedding = await embedDocument([a.title, a.snippet].filter(Boolean).join(". "));
    const { error } = await supabase!
      .from("article_embeddings")
      .upsert({ article_id: a.id, embedding }, { onConflict: "article_id" });
    if (error) throw error;
  }

  // ── PHASE A — retry PRIORITAIRE des `pending` (ADR-0005) ──
  // Avant de traiter les nouveaux, on retente les articles laissés en `pending`
  // par les runs précédents (attempts < 3). On ne bump PAS `fetched_at` ici.
  const { data: pendingRows } = await supabase
    .from("articles")
    .select("*")
    .eq("enrich_status", "pending")
    .lt("enrich_attempts", 3)
    .order("created_at", { ascending: true }) // les plus anciens d'abord
    .limit(MAX_RETRY_PER_RUN);
  // Taille réelle du backlog (honnêteté du log : on n'en traite qu'une part).
  const { count: backlog } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("enrich_status", "pending")
    .lt("enrich_attempts", 3);
  const pendingWork = (pendingRows ?? []).map((r: any) => ({
    a: rowToArticle(r),
    prior: (r.enrich_attempts as number) ?? 0,
  }));
  console.log(
    `\nÀ retenter (pending) : ${pendingWork.length}` +
      ` (backlog total ${backlog ?? pendingWork.length}, cap ${MAX_RETRY_PER_RUN}/run)`,
  );
  if (pendingWork.length) {
    const outcomes = await mapLimit(pendingWork, ENRICH_CONCURRENCY, ({ a, prior }) =>
      enrichOutcome(a, prior),
    );
    for (let k = 0; k < pendingWork.length; k++) {
      const { a } = pendingWork[k];
      const { e, ok, attempts, status } = outcomes[k];
      try {
        if (ok) await embedAndStore(a);
        // Update PARTIEL : on ne touche ni les métadonnées brutes ni fetched_at.
        const patch: Record<string, unknown> = ok
          ? {
              id: a.id,
              category: e.category,
              summary: e.summary,
              summary_orig: null,
              key_points: e.keyPoints,
              key_points_orig: null,
              pullquote: e.pullquote,
              pullquote_orig: null,
              why_it_matters: e.whyItMatters,
              enrich_status: status,
              enrich_attempts: attempts,
            }
          : { enrich_status: status, enrich_attempts: attempts };
        // Lignes déjà existantes → UPDATE ciblé par id (jamais onConflict:"id", T4).
        const { error } = await supabase.from("articles").update(patch).eq("id", a.id);
        if (error) throw error;
        if (ok) okCount++;
        else if (status === "failed") failedCount++;
        else pendingCount++;
      } catch {
        storeErr++;
      }
    }
    console.log(`  … retentés : ${okCount} ok jusqu'ici`);
  }

  // ── PHASE B — nouveaux articles ──
  // On n'enrichit/embed que les nouveaux (économie tokens + temps).
  const urls = articles.map((a) => a.url);
  const { data: existingRows } = await supabase.from("articles").select("url").in("url", urls);
  const existing = new Set((existingRows ?? []).map((r: { url: string }) => r.url));
  const fresh = articles.filter((a) => !existing.has(a.url));
  console.log(`Nouveaux à traiter : ${fresh.length}\n`);

  // 1) Enrich concurrent (réseau) — phase longue (bridée par le tokens/min Groq).
  console.log(`Enrichissement IA (classe + résume) de ${fresh.length} articles…`);
  let enriched = 0;
  const outcomes = await mapLimit(fresh, ENRICH_CONCURRENCY, async (a) => {
    const o = await enrichOutcome(a, 0); // nouveaux → 0 tentative préalable
    if (++enriched % 20 === 0 || enriched === fresh.length) {
      console.log(`  … enrichis ${enriched}/${fresh.length}`);
    }
    return o;
  });

  // 2) Embedding + stockage SÉQUENTIEL. On stocke TOUJOURS la ligne (même
  //    `pending`) pour garder les métadonnées brutes (ADR-0005) — mais on
  //    n'embed que les `ok` (rien à servir tant que non enrichi).
  console.log(`Embedding local + stockage…`);
  let stored = 0;
  for (let k = 0; k < fresh.length; k++) {
    const a = fresh[k];
    const { e, ok, attempts, status } = outcomes[k];
    try {
      const row = {
        id: a.id,
        source: a.source,
        title: a.title,
        url: a.url,
        author: a.author ?? null,
        points: a.points,
        comments: a.comments,
        published_at: a.publishedAt,
        category: e.category,
        tags: a.tags,
        snippet: a.snippet ?? null,
        image: a.image ?? null,
        heat: a.heat,
        summary: e.summary,
        summary_orig: e.summaryOrig,
        key_points: e.keyPoints,
        key_points_orig: e.keyPointsOrig,
        pullquote: e.pullquote,
        pullquote_orig: e.pullquoteOrig,
        why_it_matters: e.whyItMatters,
        enrich_status: status,
        enrich_attempts: attempts,
        fetched_at: new Date().toISOString(),
      };
      // Dédup/upsert sur l'URL canonique (T4) — jamais onConflict:"id".
      // ⚠️ La ligne `articles` DOIT être écrite AVANT l'embedding :
      // `article_embeddings.article_id` a une FK → articles(id) (migration 0003).
      const { error: aErr } = await supabase.from("articles").upsert(row, { onConflict: "url" });
      if (aErr) throw aErr;
      if (ok) await embedAndStore(a);
      if (ok) okCount++;
      else if (status === "failed") failedCount++;
      else pendingCount++;
      stored++;
    } catch {
      storeErr++;
    }
    if (stored % 10 === 0 || stored + storeErr === fresh.length) {
      console.log(`  … stockés ${stored}/${fresh.length}${storeErr ? ` (${storeErr} erreurs DB)` : ""}`);
    }
  }

  // Récap honnête de fin de run (ADR-0005 + observabilité T7).
  const ai = getAiStats();
  console.log(
    `\nRécap : retentés=${pendingWork.length} · nouveaux=${fresh.length} · ` +
      `ok=${okCount} · pending=${pendingCount} · failed=${failedCount}` +
      `${storeErr ? ` · erreurs DB=${storeErr}` : ""}.`,
  );
  console.log(
    `Groq : appels=${ai.calls} · ok=${ai.ok} · 429=${ai.rate429} · ` +
      `http_err=${ai.httpErr} · parse_err=${ai.parseErr}.`,
  );

  // 3) Snapshot du VOLUME DU JOUR par domaine → daily_topic_volume.
  //    Idempotent : recompte le volume collecté aujourd'hui à chaque passage
  //    (upsert sur (day, topic)). Alimente les vraies variations des Tendances.
  const today = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ (UTC)
  const TOPICS = ["tech", "biz", "data", "ux", "autre"];
  console.log(`\nSnapshot volume du ${today}…`);
  for (const topic of TOPICS) {
    const { count } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("category", topic)
      .gte("fetched_at", `${today}T00:00:00Z`);
    await supabase
      .from("daily_topic_volume")
      .upsert({ day: today, topic, count: count ?? 0 }, { onConflict: "day,topic" });
  }
  console.log("Snapshot enregistré.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
