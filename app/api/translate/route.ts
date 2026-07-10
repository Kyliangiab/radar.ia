import { NextResponse } from "next/server";
import { groqJSON, hasGroq, GROQ_MODEL_ENRICH } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { texts: string[] } → { texts: string[] } traduits en français.
// Repli : renvoie l'original si Groq indispo ou en cas d'échec.
export async function POST(request: Request) {
  let texts: string[] = [];
  let target = "français";
  try {
    const b = await request.json();
    texts = Array.isArray(b.texts) ? b.texts.map((t: unknown) => String(t ?? "")) : [];
    if (typeof b.target === "string" && b.target.trim()) target = b.target.trim();
  } catch {
    return NextResponse.json({ texts: [] }, { status: 400 });
  }
  if (!texts.length) return NextResponse.json({ texts: [] });
  if (!hasGroq()) return NextResponse.json({ texts });

  try {
    const parsed = await groqJSON<{ texts: string[] }>({
      system:
        `Tu traduis des textes d'actualité tech en ${target}, de façon naturelle et concise. ` +
        "Garde tels quels les noms propres, produits et sigles (GPT-4, WebGPU, GitHub…). " +
        `Si un texte est déjà en ${target}, renvoie-le tel quel. ` +
        'Réponds UNIQUEMENT en JSON : { "texts": [...] } — même nombre d\'éléments, même ordre.',
      user: `Traduis en ${target} :\n${JSON.stringify(texts)}\n\nRéponds en JSON.`,
      model: GROQ_MODEL_ENRICH,
      maxTokens: 900,
      temperature: 0.2,
    });
    const out = parsed?.texts;
    if (Array.isArray(out) && out.length === texts.length) {
      return NextResponse.json({ texts: out.map((t) => String(t ?? "")) });
    }
    return NextResponse.json({ texts });
  } catch {
    return NextResponse.json({ texts });
  }
}
