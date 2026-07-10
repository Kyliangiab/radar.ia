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
import type { Article } from "../lib/types";

const ENRICH_CONCURRENCY = 5; // appels Groq en parallèle (réseau)

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

async function main() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("✗ Supabase non configuré (SUPABASE_URL / SERVICE_ROLE_KEY). Rien à ingérer.");
    process.exit(1);
  }

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

  // On n'enrichit/embed que les nouveaux (économie tokens + temps)
  const urls = articles.map((a) => a.url);
  const { data: existingRows } = await supabase.from("articles").select("url").in("url", urls);
  const existing = new Set((existingRows ?? []).map((r: { url: string }) => r.url));
  const fresh = articles.filter((a) => !existing.has(a.url));
  console.log(`Nouveaux à traiter : ${fresh.length}\n`);

  // 1) Enrich concurrent (réseau) — phase longue (bridée par le tokens/min Groq),
  //    avec progression pour ne pas paraître planté.
  console.log(`Enrichissement IA (classe + résume) de ${fresh.length} articles…`);
  let enriched = 0;
  const enrichments = await mapLimit(fresh, ENRICH_CONCURRENCY, async (a) => {
    const e = await enrich(a);
    if (++enriched % 20 === 0 || enriched === fresh.length) {
      console.log(`  … enrichis ${enriched}/${fresh.length}`);
    }
    return e;
  });

  // 2) Embedding LOCAL e5-base — SÉQUENTIEL obligatoire : le runtime onnx n'est
  //    pas réentrant, des appels concurrents le deadlockent. Upsert au fil de l'eau.
  console.log(`Embedding local + stockage…`);
  let done = 0;
  let failed = 0;
  for (let k = 0; k < fresh.length; k++) {
    const a = fresh[k];
    const e = enrichments[k];
    try {
      const embedding = await embedDocument([a.title, a.snippet].filter(Boolean).join(". "));
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
        why_it_matters: e.whyItMatters,
        fetched_at: new Date().toISOString(),
      };
      const { error: aErr } = await supabase.from("articles").upsert(row, { onConflict: "id" });
      if (aErr) throw aErr;
      const { error: eErr } = await supabase
        .from("article_embeddings")
        .upsert({ article_id: a.id, embedding }, { onConflict: "article_id" });
      if (eErr) throw eErr;
      done++;
    } catch {
      failed++;
    }
    if ((done + failed) % 10 === 0 || done + failed === fresh.length) {
      console.log(`  … stockés ${done}/${fresh.length}${failed ? ` (${failed} échecs)` : ""}`);
    }
  }

  console.log(`\nTerminé : ${done} articles stockés${failed ? `, ${failed} échecs` : ""}.`);

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
