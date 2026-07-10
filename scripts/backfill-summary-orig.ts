/**
 * Backfill ponctuel : remplit `summary_orig` (résumé en langue d'origine) pour
 * les articles existants qui n'en ont pas encore. On traduit par lots le résumé
 * FR → anglais (langue d'origine dominante du corpus). Les articles déjà en
 * français sont laissés à null → le drawer retombe alors sur le résumé FR.
 *   npm run backfill:orig
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { groqJSON, GROQ_MODEL_ENRICH } from "../lib/ai";
import { getSupabase } from "../lib/supabase";

function isFrench(s: string): boolean {
  if (!s) return false;
  const t = " " + s.toLowerCase() + " ";
  const words = [" le ", " la ", " les ", " des ", " une ", " un ", " et ", " est ", " pour ", " avec ", " dans ", " sur ", " par ", " que ", " qui ", " aux ", " du "];
  let hits = /[éèêàçùâîô]/.test(s) ? 1 : 0;
  for (const w of words) if (t.includes(w)) hits++;
  return hits >= 2;
}

// Traduction fiable, un résumé à la fois (pas de lot → pas de désync JSON).
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

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function main() {
  const sb = getSupabase();
  if (!sb) {
    console.error("✗ Supabase non configuré.");
    process.exit(1);
  }

  const { data } = await sb
    .from("articles")
    .select("id,title,summary")
    .is("summary_orig", null)
    .not("summary", "is", null)
    .limit(2000);

  const rows = (data ?? []) as { id: string; title: string; summary: string }[];
  // On ne traduit que les articles NON français (les FR gardent null → repli).
  const todo = rows.filter((r) => r.summary && !isFrench(r.title));
  console.log(`À traiter : ${todo.length} / ${rows.length} (les FR sont laissés tels quels)`);

  let done = 0;
  let failed = 0;
  await mapLimit(todo, 5, async (r) => {
    try {
      const en = await translateOne(r.summary);
      if (!en) {
        failed++;
      } else {
        await sb.from("articles").update({ summary_orig: en }).eq("id", r.id);
        done++;
      }
    } catch {
      failed++;
    }
    if ((done + failed) % 10 === 0 || done + failed === todo.length) {
      console.log(`  … ${done}/${todo.length}${failed ? ` (${failed} échecs)` : ""}`);
    }
  });
  console.log(`\nTerminé : ${done} summary_orig remplis${failed ? `, ${failed} échecs` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
