/**
 * Backfill des résumés : remplit `summary` (FR) et `summary_orig` (langue
 * d'origine) pour les articles incomplets.
 *   - summary null      → re-enrichit (génère FR + VO) via Groq
 *   - summary sans VO   → article FR : VO = FR ; sinon traduit FR → anglais
 * Faible concurrence + retries (groqJSON) pour tenir les limites Groq.
 *   npm run backfill:orig
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { groqJSON, GROQ_MODEL_ENRICH } from "../lib/ai";
import { enrich } from "../lib/enrich";
import { getSupabase } from "../lib/supabase";
import type { Article } from "../lib/types";

function isFrench(s: string): boolean {
  if (!s) return false;
  const t = " " + s.toLowerCase() + " ";
  const words = [" le ", " la ", " les ", " des ", " une ", " un ", " et ", " est ", " pour ", " avec ", " dans ", " sur ", " par ", " que ", " qui ", " aux ", " du "];
  let hits = /[éèêàçùâîô]/.test(s) ? 1 : 0;
  for (const w of words) if (t.includes(w)) hits++;
  return hits >= 2;
}

async function translateOne(text: string): Promise<string | null> {
  const parsed = await groqJSON<{ text: string }>({
    system:
      "Tu traduis un résumé d'actualité tech en anglais, de façon naturelle et concise. " +
      "Garde les noms propres/sigles tels quels. " +
      'Réponds UNIQUEMENT en JSON : { "text": "traduction" }.',
    user: `Traduis en anglais :\n${JSON.stringify(text)}\n\nJSON.`,
    model: GROQ_MODEL_ENRICH,
    maxTokens: 400,
    temperature: 0.2,
  });
  const out = parsed?.text;
  return typeof out === "string" && out.trim() ? out.trim() : null;
}

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

type Row = {
  id: string;
  source: string;
  title: string;
  snippet: string | null;
  category: Article["category"];
  summary: string | null;
  summary_orig: string | null;
};

async function main() {
  const sb = getSupabase();
  if (!sb) {
    console.error("✗ Supabase non configuré.");
    process.exit(1);
  }

  const { data } = await sb
    .from("articles")
    .select("id,source,title,snippet,category,summary,summary_orig")
    .or("summary.is.null,summary_orig.is.null")
    .limit(2000);
  const rows = (data ?? []) as Row[];
  console.log(`À compléter : ${rows.length} articles`);

  let done = 0;
  let failed = 0;
  await mapLimit(rows, 4, async (r) => {
    try {
      const patch: Record<string, string> = {};
      if (!r.summary) {
        // Aucun résumé → re-enrichit (FR + VO).
        const e = await enrich({ source: r.source, title: r.title, snippet: r.snippet ?? "", category: r.category } as Article);
        if (e.summary) patch.summary = e.summary;
        if (e.summaryOrig) patch.summary_orig = e.summaryOrig;
        if (e.whyItMatters) patch.why_it_matters = e.whyItMatters;
      } else if (!r.summary_orig) {
        // A un FR mais pas de VO.
        if (isFrench(r.title)) patch.summary_orig = r.summary; // article FR : VO = FR
        else {
          const en = await translateOne(r.summary);
          if (en) patch.summary_orig = en;
        }
      }
      if (Object.keys(patch).length) {
        await sb.from("articles").update(patch).eq("id", r.id);
        done++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    if ((done + failed) % 10 === 0 || done + failed === rows.length) {
      console.log(`  … ${done + failed}/${rows.length} (ok ${done}, échecs ${failed})`);
    }
  });
  console.log(`\nTerminé : ${done} complétés${failed ? `, ${failed} échecs` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
