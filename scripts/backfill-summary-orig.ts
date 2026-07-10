/**
 * Backfill : re-enrichit les articles pour qu'ils aient résumé + 3 points +
 * punchline, en FR ET en langue d'origine — le tout STOCKÉ (le drawer ne fera
 * plus aucun appel IA). Traite en priorité les plus pertinents (heat), à faible
 * concurrence + retries pour tenir le free tier Groq (12k tokens/minute).
 *   npm run backfill:orig
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { enrich } from "../lib/enrich";
import { getSupabase } from "../lib/supabase";
import type { Article } from "../lib/types";

async function mapLimit<T>(items: T[], limit: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) await fn(items[i++]);
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

type Row = {
  id: string;
  source: string;
  title: string;
  snippet: string | null;
  category: Article["category"];
};

async function main() {
  const sb = getSupabase();
  if (!sb) {
    console.error("✗ Supabase non configuré.");
    process.exit(1);
  }

  // Articles pas encore complets (points manquants), les plus pertinents d'abord.
  const { data } = await sb
    .from("articles")
    .select("id,source,title,snippet,category,heat")
    .is("key_points", null)
    .order("heat", { ascending: false })
    .limit(2000);
  const rows = (data ?? []) as Row[];
  console.log(`À enrichir : ${rows.length} articles (les plus pertinents d'abord)`);

  let done = 0;
  let failed = 0;
  await mapLimit(rows, 2, async (r) => {
    try {
      const e = await enrich({ source: r.source, title: r.title, snippet: r.snippet ?? "", category: r.category } as Article);
      const patch: Record<string, unknown> = { category: e.category };
      if (e.summary) patch.summary = e.summary;
      if (e.summaryOrig) patch.summary_orig = e.summaryOrig;
      if (e.pullquote) patch.pullquote = e.pullquote;
      if (e.pullquoteOrig) patch.pullquote_orig = e.pullquoteOrig;
      if (e.whyItMatters) patch.why_it_matters = e.whyItMatters;
      // key_points TOUJOURS écrit (même []) → marque l'article comme traité
      // (évite de le reprendre en boucle) et débloque le filtre `is null`.
      patch.key_points = e.keyPoints ?? [];
      patch.key_points_orig = e.keyPointsOrig ?? e.keyPoints ?? [];
      await sb.from("articles").update(patch).eq("id", r.id);
      done++;
    } catch {
      failed++;
    }
    if ((done + failed) % 10 === 0 || done + failed === rows.length) {
      console.log(`  … ${done + failed}/${rows.length} (ok ${done}, échecs ${failed})`);
    }
  });
  console.log(`\nTerminé : ${done} enrichis${failed ? `, ${failed} échecs` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
