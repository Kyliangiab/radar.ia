/**
 * Pipeline d'ingestion — LA commande qui auto-alimente la plateforme.
 *   npm run ingest
 * Étapes : collecte (HN + Dev.to par domaine) → dédoublonnage → enrichissement IA
 * (classification + résumé) → embedding local → upsert dans Supabase.
 *
 * Sans SUPABASE_URL/KEY : le script tourne "à blanc" (dry-run) et log ce qu'il
 * insérerait — utile pour tester la chaîne sans base.
 */
import "dotenv/config";
import { getFeed, collectExtraSources } from "../lib/sources";
import { enrich } from "../lib/enrich";
import { embedDocument } from "../lib/embeddings";
import { getSupabase } from "../lib/supabase";
import type { Article, CategoryId } from "../lib/types";

const CATEGORIES: CategoryId[] = ["all", "tech", "biz", "data", "ux"];

async function collect(): Promise<Article[]> {
  // HN + Dev.to par domaine, ET les sources additionnelles (RSS + Product Hunt +
  // NewsAPI opt.) — ces dernières ne tournent QUE dans le pipeline, jamais en
  // serverless. L'IA (Groq) reclassera chaque article dans le bon domaine.
  const [feedBatches, extra] = await Promise.all([
    Promise.all(CATEGORIES.map((c) => getFeed(c))),
    collectExtraSources(),
  ]);
  const all = [...feedBatches.flat(), ...extra];

  // Compte par source (visibilité de la collecte, utile en dry-run)
  const bySource = all.reduce<Record<string, number>>((acc, a) => {
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

  const seen = new Set<string>();
  const unique: Article[] = [];
  for (const a of all) {
    const key = a.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(a);
  }
  return unique;
}

async function main() {
  const supabase = getSupabase();
  const dryRun = !supabase;
  console.log(dryRun ? "⚠️  Mode dry-run (pas de Supabase configuré)\n" : "→ Ingestion Supabase\n");

  const articles = await collect();
  console.log(`Collectés : ${articles.length} articles uniques`);

  // On n'enrichit/embed que les nouveaux (économie de tokens + temps)
  let existing = new Set<string>();
  if (supabase) {
    const urls = articles.map((a) => a.url);
    const { data } = await supabase.from("articles").select("url").in("url", urls);
    existing = new Set((data ?? []).map((r: { url: string }) => r.url));
  }
  const fresh = articles.filter((a) => !existing.has(a.url));
  console.log(`Nouveaux à traiter : ${fresh.length}\n`);

  let done = 0;
  for (const a of fresh) {
    const e = await enrich(a);
    const text = [a.title, a.snippet, e.summary].filter(Boolean).join(". ");
    const embedding = await embedDocument(text);

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
      embedding,
      fetched_at: new Date().toISOString(),
    };

    if (dryRun) {
      console.log(`  [dry] ${e.category.padEnd(4)} ${a.title.slice(0, 62)}`);
    } else {
      const { error } = await supabase!.from("articles").upsert(row, { onConflict: "id" });
      if (error) console.error(`  ✗ ${a.title.slice(0, 50)} — ${error.message}`);
      else console.log(`  ✓ ${e.category.padEnd(4)} ${a.title.slice(0, 62)}`);
    }
    done++;
  }

  console.log(`\nTerminé : ${done} articles traités${dryRun ? " (dry-run)" : " et stockés"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
