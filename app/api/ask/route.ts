import { NextResponse } from "next/server";
import { z } from "zod";
import { groqJSON, hasGroq, groqModelSmart } from "@/lib/ai";
import { getSupabase } from "@/lib/supabase";
import { requireUser, rateLimit } from "@/lib/apiGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `Tu es Radar, un assistant de veille techno. On te donne un article
(titre, source, résumé) et une question de l'utilisateur à son sujet.
Réponds en français, de façon concrète et honnête, en 2 à 4 phrases max.
Ne fabrique pas de chiffres : si l'info n'est pas dans le contexte, dis-le et
renvoie l'utilisateur vers la source. Pas d'emoji, pas de superlatifs creux.
Réponds UNIQUEMENT en JSON valide : { "answer": "…" }`;

const AskSchema = z.object({
  title: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
  snippet: z.string().max(4000).optional(),
  summary: z.string().max(4000).optional(),
  question: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  if (!hasGroq()) return NextResponse.json({ error: "no_key" }, { status: 200 });

  // Route Groq → session requise + rate limit par user (ADR-0002, T9).
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "no_db" }, { status: 200 });
  const auth = await requireUser(request, supabase);
  if (auth instanceof NextResponse) return auth;
  if (!rateLimit(`ask:${auth.user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let b: z.infer<typeof AskSchema>;
  try {
    b = AskSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const question = b.question.trim();

  const context = [
    `Titre : ${b.title ?? ""}`,
    `Source : ${b.source ?? ""}`,
    b.summary ? `Résumé : ${b.summary}` : b.snippet ? `Extrait : ${b.snippet}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const parsed = await groqJSON<{ answer: string }>({
      system: SYSTEM,
      user: `Article :\n${context}\n\nQuestion : ${question}\n\nRéponds en JSON.`,
      model: groqModelSmart(),
      maxTokens: 512,
      temperature: 0.4,
    });
    if (!parsed?.answer) return NextResponse.json({ error: "ai_failed" }, { status: 200 });
    return NextResponse.json({ answer: parsed.answer }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 200 });
  }
}
