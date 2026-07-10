import { NextResponse } from "next/server";
import { groqJSON, hasGroq, GROQ_MODEL_SMART } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `Tu es Radar, un assistant de veille techno. On te donne un article
(titre, source, résumé) et une question de l'utilisateur à son sujet.
Réponds en français, de façon concrète et honnête, en 2 à 4 phrases max.
Ne fabrique pas de chiffres : si l'info n'est pas dans le contexte, dis-le et
renvoie l'utilisateur vers la source. Pas d'emoji, pas de superlatifs creux.
Réponds UNIQUEMENT en JSON valide : { "answer": "…" }`;

type AskBody = { title?: string; source?: string; snippet?: string; summary?: string; question?: string };

export async function POST(request: Request) {
  if (!hasGroq()) return NextResponse.json({ error: "no_key" }, { status: 200 });

  let b: AskBody = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const question = String(b.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "empty" }, { status: 200 });

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
      model: GROQ_MODEL_SMART,
      maxTokens: 512,
      temperature: 0.4,
    });
    if (!parsed?.answer) return NextResponse.json({ error: "ai_failed" }, { status: 200 });
    return NextResponse.json({ answer: parsed.answer }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 200 });
  }
}
