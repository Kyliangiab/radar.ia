import { groqJSON, GROQ_MODEL_ENRICH } from "./ai";
import type { Article, CategoryId } from "./types";

const DOMAINS: CategoryId[] = ["tech", "biz", "data", "ux"];

// Classe + résume + "pourquoi ça compte". Le summary alimente le side panel
// (le feed reste titre + source). On n'a que titre+snippet → l'IA reste générale.
const SYSTEM = `Tu enrichis un article de veille tech.
1) Classe-le dans UN domaine : "tech" (produits/hardware/infra), "biz" (business/startups/marché),
   "data" (data/IA/LLM/ML) ou "ux" (UX/design/UI/accessibilité).
2) Résume-le en 2 phrases max pour un lecteur pressé (tu n'as que le titre et parfois une courte
   description : n'invente pas de faits précis, reste général si l'info manque). Fournis ce résumé
   EN FRANÇAIS ("summary") ET dans la LANGUE D'ORIGINE de l'article ("summaryOrig") — même sens.
3) En 1 phrase EN FRANÇAIS : pourquoi c'est pertinent pour une veille tech / design / IA.
Réponds UNIQUEMENT en JSON valide :
{ "category": "tech|biz|data|ux", "summary": "2 phrases max (français)", "summaryOrig": "2 phrases max (langue d'origine)", "whyItMatters": "1 phrase (français)" }`;

export interface Enrichment {
  category: CategoryId;
  summary: string | null;
  summaryOrig: string | null;
  whyItMatters: string | null;
}

type Raw = { category: CategoryId; summary?: string; summaryOrig?: string; whyItMatters?: string };

/** Classe + résume un article via Groq. Sans clé / erreur : catégorie d'origine, summary null. */
export async function enrich(a: Article): Promise<Enrichment> {
  const fallback: Enrichment = {
    category: DOMAINS.includes(a.category) ? a.category : "tech",
    summary: null,
    summaryOrig: null,
    whyItMatters: null,
  };
  try {
    const parsed = await groqJSON<Raw>({
      system: SYSTEM,
      user: `Source : ${a.source}\nTitre : ${a.title}\nDescription : ${a.snippet || "(aucune)"}`,
      model: GROQ_MODEL_ENRICH,
      maxTokens: 600,
    });
    if (!parsed) return fallback;
    return {
      category: DOMAINS.includes(parsed.category) ? parsed.category : fallback.category,
      summary: parsed.summary ?? null,
      summaryOrig: parsed.summaryOrig ?? parsed.summary ?? null,
      whyItMatters: parsed.whyItMatters ?? null,
    };
  } catch {
    return fallback;
  }
}
