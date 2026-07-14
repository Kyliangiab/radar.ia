import { NextResponse } from "next/server";
import { groqJSON, hasGroq, groqModelSmart } from "@/lib/ai";
import type { Summary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_FR = `Tu résumes un article de veille tech pour un lecteur pressé, en français.
Tu n'as que le titre (et parfois une courte description), pas le texte intégral :
appuie-toi dessus sans inventer de faits précis. Reste général si l'info manque.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format :
{
  "summary": "3-4 phrases : ce dont ça parle et le contexte",
  "whyItMatters": "1 phrase : pourquoi c'est pertinent pour une veille tech/design/IA",
  "points": ["point clé concret", "autre point clé", "3e point clé"],
  "pullquote": "une phrase percutante à ressortir en réunion (sans guillemets)"
}
Donne exactement 3 points courts. Ton clair, pas d'emoji, pas de superlatifs.`;

const SYSTEM_EN = `You summarize a tech-watch article for a busy reader, in the article's original language (English).
You only have the title (and sometimes a short description), not the full text:
rely on it without inventing precise facts. Stay general if info is missing.
Reply ONLY with a valid JSON object, no surrounding text, in the format:
{
  "summary": "3-4 sentences: what it's about and the context",
  "whyItMatters": "1 sentence: why it matters for a tech/design/AI watch",
  "points": ["concrete key point", "another key point", "3rd key point"],
  "pullquote": "one punchy sentence to drop in a meeting (no quotes)"
}
Give exactly 3 short points. Clear tone, no emoji, no empty superlatives.`;

export async function POST(request: Request) {
  if (!hasGroq()) {
    return NextResponse.json({ error: "no_key" }, { status: 200 });
  }

  let title = "";
  let snippet = "";
  let source = "";
  let lang: "fr" | "en" = "fr";
  try {
    const body = await request.json();
    title = String(body.title ?? "");
    snippet = String(body.snippet ?? "");
    source = String(body.source ?? "");
    if (body.lang === "en") lang = "en";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "empty" }, { status: 200 });
  }

  try {
    const parsed = await groqJSON<Summary>({
      system: lang === "en" ? SYSTEM_EN : SYSTEM_FR,
      user: `Source: ${source}\nTitle: ${title}\nDescription: ${snippet || "(none)"}\n\nReturn the JSON summary.`,
      model: groqModelSmart(),
      maxTokens: 768,
    });
    if (!parsed || !parsed.summary) {
      return NextResponse.json({ error: "ai_failed" }, { status: 200 });
    }
    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 200 });
  }
}
