import { NextResponse } from "next/server";
import { groqJSON, hasGroq, groqModelSmart } from "@/lib/ai";
import type { Article, Briefing } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `Tu es l'éditeur d'une plateforme de veille technologique (tech, UI/design, IA, dev).
On te donne les titres phares du jour. Produis un briefing bref, lucide et concret, en français.
Repère les vraies tendances et signaux faibles, pas juste un résumé des titres.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "headline": "une phrase qui capte le fil rouge du jour (max ~14 mots)",
  "trends": [
    { "title": "tendance courte (max 6 mots)", "why": "pourquoi ça compte, 1 phrase concrète" }
  ],
  "watch": "un signal faible ou un truc à surveiller (1 phrase)"
}
Donne 3 à 4 tendances. Ton direct, pas de superlatifs creux, pas d'emoji.`;

export async function POST(request: Request) {
  if (!hasGroq()) {
    return NextResponse.json({ error: "no_key" }, { status: 200 });
  }

  let articles: Article[] = [];
  try {
    const body = await request.json();
    articles = Array.isArray(body.articles) ? body.articles : [];
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (articles.length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 200 });
  }

  const digest = articles
    .slice(0, 22)
    .map(
      (a, i) =>
        `${i + 1}. [${a.source} · ${a.category}] ${a.title} (${a.points} pts, ${a.comments} comm.)`,
    )
    .join("\n");

  try {
    const parsed = await groqJSON<Briefing>({
      system: SYSTEM,
      user: `Titres phares du jour :\n\n${digest}\n\nGénère le briefing JSON.`,
      model: groqModelSmart(),
      maxTokens: 1024,
      temperature: 0.5,
    });
    if (!parsed || !parsed.trends) {
      return NextResponse.json({ error: "ai_failed" }, { status: 200 });
    }
    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 200 });
  }
}
