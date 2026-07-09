import { groqJSON, GROQ_MODEL_FAST } from "./ai";
import type { Article, CategoryId } from "./types";

const DOMAINS: CategoryId[] = ["tech", "biz", "data", "ux"];

const SYSTEM = `Tu enrichis des articles pour une plateforme de veille tech, en français.
Classe chaque article dans UN des 4 domaines :
- "tech"  : produits, hardware, infra, actualité tech générale
- "biz"   : business de la tech, startups, financement, marché, carrière
- "data"  : data, IA, LLM, machine learning
- "ux"    : UX, design, UI, accessibilité, solutions numériques
Puis résume-le pour un lecteur pressé (tu n'as que le titre et parfois une courte
description : n'invente pas de faits précis).
Réponds UNIQUEMENT en JSON valide, sans texte autour :
{ "category": "tech|biz|data|ux", "summary": "2 phrases max", "whyItMatters": "1 phrase" }`;

export interface Enrichment {
  category: CategoryId;
  summary: string | null;
  whyItMatters: string | null;
}

/** Classe + résume un article via Groq. Sans clé : renvoie la catégorie d'origine, sans résumé. */
export async function enrich(a: Article): Promise<Enrichment> {
  const fallback: Enrichment = {
    category: DOMAINS.includes(a.category) ? a.category : "tech",
    summary: a.snippet ?? null,
    whyItMatters: null,
  };

  try {
    const parsed = await groqJSON<Enrichment>({
      system: SYSTEM,
      user: `Source : ${a.source}\nTitre : ${a.title}\nDescription : ${a.snippet || "(aucune)"}`,
      model: GROQ_MODEL_FAST,
      maxTokens: 512,
    });
    if (!parsed) return fallback; // pas de clé Groq configurée
    return {
      category: DOMAINS.includes(parsed.category) ? parsed.category : fallback.category,
      summary: parsed.summary ?? fallback.summary,
      whyItMatters: parsed.whyItMatters ?? null,
    };
  } catch {
    return fallback;
  }
}
