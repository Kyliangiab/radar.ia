import { NextResponse } from "next/server";
import { groqJSON, hasGroq, GROQ_MODEL_FAST } from "@/lib/ai";
import type { Summary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `Tu résumes un article de veille tech pour un lecteur pressé, en français.
Tu n'as que le titre (et parfois une courte description), pas le texte intégral :
appuie-toi dessus sans inventer de faits précis. Reste général si l'info manque.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format :
{
  "summary": "2 phrases max, ce dont ça parle",
  "whyItMatters": "1 phrase : pourquoi c'est pertinent pour une veille tech/design/IA"
}
Ton clair, pas d'emoji, pas de superlatifs.`;

export async function POST(request: Request) {
  if (!hasGroq()) {
    return NextResponse.json({ error: "no_key" }, { status: 200 });
  }

  let title = "";
  let snippet = "";
  let source = "";
  try {
    const body = await request.json();
    title = String(body.title ?? "");
    snippet = String(body.snippet ?? "");
    source = String(body.source ?? "");
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "empty" }, { status: 200 });
  }

  try {
    const parsed = await groqJSON<Summary>({
      system: SYSTEM,
      user: `Source : ${source}\nTitre : ${title}\nDescription : ${snippet || "(aucune)"}\n\nGénère le résumé JSON.`,
      model: GROQ_MODEL_FAST,
      maxTokens: 512,
    });
    if (!parsed || !parsed.summary) {
      return NextResponse.json({ error: "ai_failed" }, { status: 200 });
    }
    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 200 });
  }
}
