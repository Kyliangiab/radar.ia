import { groqJSON, GROQ_MODEL_ENRICH } from "./ai";
import type { Article, CategoryId } from "./types";

const DOMAINS: CategoryId[] = ["tech", "biz", "data", "ux"];

// Classe + résume + points + punchline, en FRANÇAIS ET en langue d'origine.
// Tout est stocké à l'ingestion → le drawer n'appelle plus l'IA à l'ouverture.
const SYSTEM = `Tu enrichis un article de veille tech. Tu n'as que le titre et parfois une courte
description : n'invente pas de faits précis, reste général si l'info manque.
1) Classe-le dans UN domaine : "tech", "biz", "data" ou "ux".
2) Produis une SYNTHÈSE (2-3 phrases, pas une citation ni une reprise du titre).
3) Donne exactement 3 points clés courts, DISTINCTS du résumé.
4) Donne une punchline "à ressortir en réunion", DIFFÉRENTE du résumé, sans guillemets.
Fournis TOUT en français ET dans la langue d'origine de l'article.
Réponds UNIQUEMENT en JSON valide :
{
  "category": "tech|biz|data|ux",
  "summary": "2-3 phrases (français)",
  "summaryOrig": "2-3 phrases (langue d'origine)",
  "points": ["point 1 (fr)", "point 2 (fr)", "point 3 (fr)"],
  "pointsOrig": ["point 1 (origine)", "point 2 (origine)", "point 3 (origine)"],
  "pullquote": "punchline (français)",
  "pullquoteOrig": "punchline (langue d'origine)",
  "whyItMatters": "1 phrase (français) : pourquoi c'est pertinent"
}`;

export interface Enrichment {
  category: CategoryId;
  summary: string | null;
  summaryOrig: string | null;
  keyPoints: string[] | null;
  keyPointsOrig: string[] | null;
  pullquote: string | null;
  pullquoteOrig: string | null;
  whyItMatters: string | null;
}

type Raw = {
  category: CategoryId;
  summary?: string;
  summaryOrig?: string;
  points?: unknown;
  pointsOrig?: unknown;
  pullquote?: string;
  pullquoteOrig?: string;
  whyItMatters?: string;
};

const arr3 = (v: unknown): string[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 3);
  return out.length ? out : null;
};

/** Classe + enrichit un article via Groq. Sans clé / erreur : catégorie d'origine, champs null. */
export async function enrich(a: Article): Promise<Enrichment> {
  const fallback: Enrichment = {
    category: DOMAINS.includes(a.category) ? a.category : "tech",
    summary: null,
    summaryOrig: null,
    keyPoints: null,
    keyPointsOrig: null,
    pullquote: null,
    pullquoteOrig: null,
    whyItMatters: null,
  };
  try {
    const parsed = await groqJSON<Raw>({
      system: SYSTEM,
      user: `Source : ${a.source}\nTitre : ${a.title}\nDescription : ${a.snippet || "(aucune)"}`,
      model: GROQ_MODEL_ENRICH,
      maxTokens: 1000,
    });
    if (!parsed) return fallback;
    return {
      category: DOMAINS.includes(parsed.category) ? parsed.category : fallback.category,
      summary: parsed.summary ?? null,
      summaryOrig: parsed.summaryOrig ?? parsed.summary ?? null,
      keyPoints: arr3(parsed.points),
      keyPointsOrig: arr3(parsed.pointsOrig) ?? arr3(parsed.points),
      pullquote: parsed.pullquote ?? null,
      pullquoteOrig: parsed.pullquoteOrig ?? parsed.pullquote ?? null,
      whyItMatters: parsed.whyItMatters ?? null,
    };
  } catch {
    return fallback;
  }
}
