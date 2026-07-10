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

async function translateBatch(texts: string[]): Promise<string[] | null> {
  const parsed = await groqJSON<{ texts: string[] }>({
    system:
      "Tu traduis des résumés d'actualité tech en anglais, de façon naturelle et concise. " +
      "Garde les noms propres/sigles tels quels. " +
      'Réponds UNIQUEMENT en JSON : { "texts": [...] } — même nombre, même ordre.',
    user: `Traduis en anglais :\n${JSON.stringify(texts)}\n\nJSON.`,
    model: GROQ_MODEL_ENRICH,
    maxTokens: 1500,
    temperature: 0.2,
  });
  const out = parsed?.texts;
  return Array.isArray(out) && out.length === texts.length ? out : null;
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

  const BATCH = 12;
  let done = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    try {
      const translated = await translateBatch(chunk.map((r) => r.summary));
      if (!translated) {
        failed += chunk.length;
      } else {
        await Promise.all(
          chunk.map((r, k) => sb.from("articles").update({ summary_orig: translated[k] }).eq("id", r.id)),
        );
        done += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
    console.log(`  … ${done}/${todo.length}${failed ? ` (${failed} échecs)` : ""}`);
  }
  console.log(`\nTerminé : ${done} summary_orig remplis${failed ? `, ${failed} échecs` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
