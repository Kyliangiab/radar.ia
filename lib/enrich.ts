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

/**
 * Mappe la réponse JSON de Groq (`Raw`) → `Enrichment`. Fonction PURE (sans
 * réseau) → testable. `parsed=null` ⇒ pas de clé Groq (`failReason="config"`).
 * La VO (*Orig) n'est plus générée ici (ADR-0002) : null.
 */
export function parseEnrichment(parsed: Raw | null, fallbackCategory: CategoryId): Enrichment {
  const empty = (failReason: EnrichFail): Enrichment => ({
    category: fallbackCategory,
    summary: null,
    summaryOrig: null,
    keyPoints: null,
    keyPointsOrig: null,
    pullquote: null,
    pullquoteOrig: null,
    whyItMatters: null,
    failReason,
  });
  if (!parsed) return empty("config");
  return {
    category: DOMAINS.includes(parsed.category) ? parsed.category : fallbackCategory,
    summary: parsed.summary ?? null,
    summaryOrig: null,
    keyPoints: arr3(parsed.points),
    keyPointsOrig: null,
    pullquote: parsed.pullquote ?? null,
    pullquoteOrig: null,
    whyItMatters: parsed.whyItMatters ?? null,
    failReason: "none",
  };
}

/** Classe + enrichit un article via Groq. Sans clé / erreur : catégorie d'origine, champs null. */
export async function enrich(a: Article): Promise<Enrichment> {
  const fallbackCategory: CategoryId = DOMAINS.includes(a.category) ? a.category : "tech";
  try {
    const snippet = (a.snippet || "").slice(0, ENRICH_INPUT_MAX_CHARS);
    const parsed = await groqJSON<Raw>({
      system: SYSTEM,
      user: `Source : ${a.source}\nTitre : ${a.title}\nDescription : ${snippet || "(aucune)"}`,
      model: groqModelEnrich(),
      maxTokens: ENRICH_MAX_TOKENS,
    });
    return parseEnrichment(parsed, fallbackCategory);
  } catch (err) {
    // Cause portée par l'erreur (429 / http / parse). Défaut prudent : "http".
    const cause = (err as GroqError).groqFailure ?? "http";
    return { ...parseEnrichment(null, fallbackCategory), failReason: cause };
  }
}

// ── Machine à états d'enrichissement (ADR-0005) — source unique ──
// Utilisée par l'ingest (cron) ET par /api/sources (flux perso) : tout chemin
// d'ingestion DOIT passer par cet état. Un enrichissement raté ne produit
// JAMAIS de ligne "vide et servie" : la ligne reste `pending` (métadonnées
// brutes conservées) et `enrich_attempts` grimpe ; à 3 tentatives → `failed`.
// Seul `ok` est servi au feed.
export type EnrichStatus = "ok" | "pending" | "failed";

export interface EnrichOutcome {
  e: Enrichment;
  ok: boolean;
  attempts: number;
  status: EnrichStatus;
}

/**
 * Décision PURE de la machine à états (ADR-0005) → testable sans réseau.
 * `rate429` = surcharge de charge, PAS la faute de l'article : ne consomme PAS
 * de tentative (sinon un pic de 429 condamnerait des articles valides). Les
 * échecs imputables (parse / http / clé absente) incrémentent ; à 3 → failed.
 */
export function decideOutcome(
  summary: string | null | undefined,
  failReason: EnrichFail,
  priorAttempts: number,
): { ok: boolean; attempts: number; status: EnrichStatus } {
  const ok = !!summary?.trim();
  const consumesAttempt = !ok && failReason !== "rate429";
  const attempts = consumesAttempt ? priorAttempts + 1 : priorAttempts;
  const status: EnrichStatus = ok ? "ok" : attempts >= 3 ? "failed" : "pending";
  return { ok, attempts, status };
}

export async function enrichOutcome(a: Article, priorAttempts: number): Promise<EnrichOutcome> {
  const e = await enrich(a);
  const { ok, attempts, status } = decideOutcome(e.summary, e.failReason, priorAttempts);
  return { e, ok, attempts, status };
}
