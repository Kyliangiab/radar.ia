import { groqJSON, groqModelEnrich, type GroqError, type GroqFailure } from "./ai";
import type { Article, CategoryId } from "./types";

// Cause d'un enrichissement raté (transient, non persisté) : sert à la machine
// à états (ADR-0005) — un échec 429 ne doit PAS compter comme une tentative.
// "none" = succès ; "config" = pas de clé Groq (échec systémique).
export type EnrichFail = GroqFailure | "none" | "config";

const DOMAINS: CategoryId[] = ["tech", "biz", "data", "ux"];

// Classe + résume + points + punchline, en FRANÇAIS uniquement.
// La VO (summaryOrig/…) n'est plus générée à l'ingestion (régime de tokens,
// ADR-0002) : elle est produite À LA DEMANDE via /api/translate. Tout le reste
// est stocké à l'ingestion → le drawer n'appelle plus l'IA à l'ouverture.
const SYSTEM = `Tu enrichis un article de veille tech. Tu n'as que le titre et parfois une courte
description : n'invente pas de faits précis, reste général si l'info manque.
1) Classe-le dans UN domaine : "tech", "biz", "data" ou "ux".
2) Produis une SYNTHÈSE (2-3 phrases, pas une citation ni une reprise du titre).
3) Donne exactement 3 points clés courts, DISTINCTS du résumé.
4) Donne une punchline "à ressortir en réunion", DIFFÉRENTE du résumé, sans guillemets.
Fournis TOUT en français.
Réponds UNIQUEMENT en JSON valide :
{
  "category": "tech|biz|data|ux",
  "summary": "2-3 phrases (français)",
  "points": ["point 1 (fr)", "point 2 (fr)", "point 3 (fr)"],
  "pullquote": "punchline (français)",
  "whyItMatters": "1 phrase (français) : pourquoi c'est pertinent"
}`;

// Troncature de l'input envoyé à Groq (régime de tokens, ADR-0002).
const ENRICH_INPUT_MAX_CHARS = Number(process.env.ENRICH_INPUT_MAX_CHARS) || 800;
// Budget de sortie (max_tokens). gpt-oss-20b est un modèle à raisonnement : le
// reasoning consomme ce budget AVANT l'émission du JSON → si trop bas,
// finish_reason="length" et parse KO. Réglable en env (T7). Défaut 1000.
const ENRICH_MAX_TOKENS = Number(process.env.ENRICH_MAX_TOKENS) || 1000;

export interface Enrichment {
  category: CategoryId;
  summary: string | null;
  summaryOrig: string | null;
  keyPoints: string[] | null;
  keyPointsOrig: string[] | null;
  pullquote: string | null;
  pullquoteOrig: string | null;
  whyItMatters: string | null;
  failReason: EnrichFail; // "none" si succès ; cause de l'échec sinon
}

type Raw = {
  category: CategoryId;
  summary?: string;
  points?: unknown;
  pullquote?: string;
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
    failReason: "none",
  };
  try {
    const snippet = (a.snippet || "").slice(0, ENRICH_INPUT_MAX_CHARS);
    const parsed = await groqJSON<Raw>({
      system: SYSTEM,
      user: `Source : ${a.source}\nTitre : ${a.title}\nDescription : ${snippet || "(aucune)"}`,
      model: groqModelEnrich(),
      maxTokens: ENRICH_MAX_TOKENS,
    });
    // parsed === null ⇒ pas de clé Groq (échec systémique, pas 429).
    if (!parsed) return { ...fallback, failReason: "config" };
    // La VO (*Orig) n'est plus générée ici (ADR-0002) : traduite à la demande
    // via /api/translate. On garde les champs à null (colonnes conservées).
    return {
      category: DOMAINS.includes(parsed.category) ? parsed.category : fallback.category,
      summary: parsed.summary ?? null,
      summaryOrig: null,
      keyPoints: arr3(parsed.points),
      keyPointsOrig: null,
      pullquote: parsed.pullquote ?? null,
      pullquoteOrig: null,
      whyItMatters: parsed.whyItMatters ?? null,
      failReason: "none",
    };
  } catch (err) {
    // Cause portée par l'erreur (429 / http / parse). Défaut prudent : "http".
    const cause = (err as GroqError).groqFailure ?? "http";
    return { ...fallback, failReason: cause };
  }
}
