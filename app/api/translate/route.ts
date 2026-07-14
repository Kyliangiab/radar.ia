import { NextResponse } from "next/server";
import { z } from "zod";
import { groqJSON, hasGroq, groqModelEnrich } from "@/lib/ai";
import { clientIp, rateLimit } from "@/lib/apiGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC (seul appelant = landing pré-login) mais durci (T9) : caps stricts +
// rate limit par IP pour ne pas laisser brûler la clé Groq (ADR-0002).
const TranslateSchema = z.object({
  texts: z.array(z.string().max(500)).min(1).max(12),
  target: z.string().trim().min(1).max(40).optional(),
});
const MAX_TOTAL_CHARS = 4000;

// POST { texts: string[], target? } → { texts: string[] } traduits.
// Repli : renvoie l'original si Groq indispo ou en cas d'échec.
export async function POST(request: Request) {
  if (!rateLimit(`translate:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited", texts: [] }, { status: 429 });
  }

  let texts: string[];
  let target = "français";
  try {
    const b = TranslateSchema.parse(await request.json());
    texts = b.texts;
    if (b.target) target = b.target;
  } catch {
    return NextResponse.json({ texts: [] }, { status: 400 });
  }
  if (texts.reduce((n, t) => n + t.length, 0) > MAX_TOTAL_CHARS) {
    return NextResponse.json({ error: "too_large", texts: [] }, { status: 400 });
  }
  if (!hasGroq()) return NextResponse.json({ texts });

  try {
    const parsed = await groqJSON<{ texts: string[] }>({
      system:
        `Tu traduis des textes d'actualité tech en ${target}, de façon naturelle et concise. ` +
        "Garde tels quels les noms propres, produits et sigles (GPT-4, WebGPU, GitHub…). " +
        `Si un texte est déjà en ${target}, renvoie-le tel quel. ` +
        'Réponds UNIQUEMENT en JSON : { "texts": [...] } — même nombre d\'éléments, même ordre.',
      user: `Traduis en ${target} :\n${JSON.stringify(texts)}\n\nRéponds en JSON.`,
      model: groqModelEnrich(),
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
