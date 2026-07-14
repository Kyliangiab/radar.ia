/**
 * Couche IA — Groq (API OpenAI-compatible).
 * Un seul point d'entrée pour tout l'enrichissement / briefing / résumé.
 * Sans GROQ_API_KEY : `hasGroq()` renvoie false et les appelants basculent
 * proprement en mode dégradé (aucune IA, pas de crash).
 *
 * Choix des modèles (ADR-0002 — lus depuis l'env, JAMAIS codés en dur) :
 *  - ENRICH : openai/gpt-oss-20b — enrichissement de MASSE à l'ingestion
 *    (classer + résumer). Volume élevé → modèle "instant" à faible coût/appel.
 *  - SMART  : openai/gpt-oss-120b — briefing éditorial + Ask Radar, faible
 *    volume, raisonnement plus fin.
 * Lecture PARESSEUSE (fonctions, pas const) : `scripts/ingest.ts` charge
 * `.env.local` via dotenv APRÈS l'évaluation des modules importés ; une const
 * lue au niveau module verrait `undefined`. Même raison que la lecture lazy de
 * `GROQ_API_KEY` ci-dessous. Les Llama 3.x sont dépréciés depuis le 17/06/2026.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Modèle d'enrichissement de masse (enrich, translate). Défaut ADR-0002. */
export function groqModelEnrich(): string {
  return process.env.GROQ_MODEL_ENRICH?.trim() || "openai/gpt-oss-20b";
}
/** Modèle "smart" bas volume (briefing, ask). Défaut ADR-0002. */
export function groqModelSmart(): string {
  return process.env.GROQ_MODEL_SMART?.trim() || "openai/gpt-oss-120b";
}

export function hasGroq(): boolean {
  return !!process.env.GROQ_API_KEY;
}

// ── Observabilité du pipeline (T7) ──
// Compteurs de session pour ventiler les modes d'échec Groq (aujourd'hui
// silencieux). Lus par le récap de fin de run d'ingestion.
export interface AiStats {
  calls: number; // appels groqJSON initiés
  ok: number; // réponses parsées avec succès
  rate429: number; // réponses 429 (rate limit tokens/minute), retries inclus
  httpErr: number; // erreurs HTTP non-429
  parseErr: number; // JSON.parse KO (souvent finish_reason="length")
}
const aiStats: AiStats = { calls: 0, ok: 0, rate429: 0, httpErr: 0, parseErr: 0 };

// Cause d'échec attachée aux erreurs levées par groqJSON (concurrency-safe :
// portée par l'erreur elle-même, pas par les compteurs globaux partagés).
// "rate429" = surcharge (pas la faute de l'article) ; "http"/"parse" = tentative.
export type GroqFailure = "rate429" | "http" | "parse";
export interface GroqError extends Error {
  groqFailure?: GroqFailure;
}
function groqError(cause: GroqFailure, message: string): GroqError {
  const e = new Error(message) as GroqError;
  e.groqFailure = cause;
  return e;
}
export function getAiStats(): AiStats {
  return { ...aiStats };
}
export function resetAiStats(): void {
  aiStats.calls = 0;
  aiStats.ok = 0;
  aiStats.rate429 = 0;
  aiStats.httpErr = 0;
  aiStats.parseErr = 0;
}

interface GroqOpts {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Délai avant retry sur 429 : honore `retry-after` (secondes) sinon backoff expo.
function retryDelayMs(res: Response, attempt: number): number {
  const ra = res.headers.get("retry-after");
  if (ra) {
    const s = parseFloat(ra);
    if (!Number.isNaN(s)) return Math.min(30000, s * 1000 + 250);
  }
  return Math.min(30000, 2 ** attempt * 1000); // 1s, 2s, 4s, 8s…
}

/**
 * Appelle Groq en mode JSON strict et renvoie l'objet parsé.
 * `response_format: json_object` force un JSON valide (les prompts contiennent
 * tous le mot « JSON », requis par l'API). Retry/backoff sur 429 (rate limit
 * tokens/minute) → aucun article droppé en silence. Renvoie null si la clé
 * manque. Lève sur erreur réseau/HTTP non-429 (l'appelant catch → fallback).
 */
export async function groqJSON<T>({
  system,
  user,
  model = groqModelEnrich(),
  maxTokens = 800,
  temperature = 0.4,
  reasoningEffort = "low",
}: GroqOpts): Promise<T | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  // reasoning_effort seulement pour les modèles à raisonnement (gpt-oss).
  // Sans effort "low", tout le budget de tokens part en reasoning et le JSON
  // n'est jamais émis. Sur un modèle non-reasoning (llama) le param est inutile.
  if (model.includes("gpt-oss")) body.reasoning_effort = reasoningEffort;

  aiStats.calls++;
  const MAX_RETRY = 4;
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        aiStats.rate429++; // chaque 429 compté (retries inclus)
        if (attempt < MAX_RETRY) {
          await sleep(retryDelayMs(res, attempt));
          continue;
        }
        // 429 persistant après retries → échec de charge, PAS la faute de l'article
        // (ADR-0005 révisé : l'appelant ne doit pas incrémenter enrich_attempts).
        console.warn(`[groq] 429 persistant après ${MAX_RETRY} retries — model=${model}`);
        throw groqError("rate429", `Groq HTTP 429 (rate limit) après ${MAX_RETRY} retries`);
      }
      if (!res.ok) {
        aiStats.httpErr++;
        const detail = await res.text().catch(() => "");
        console.warn(`[groq] HTTP ${res.status} — model=${model} : ${detail.slice(0, 200).replace(/\s+/g, " ").trim()}`);
        throw groqError("http", `Groq HTTP ${res.status}: ${detail}`);
      }
      const data = await res.json();
      const choice = data?.choices?.[0];
      const text: string = choice?.message?.content ?? "";
      try {
        const parsed = JSON.parse(text) as T;
        aiStats.ok++;
        return parsed;
      } catch (parseErr) {
        aiStats.parseErr++;
        // Diagnostic : finish_reason="length" ⇒ budget max_tokens épuisé
        // (souvent par le reasoning des modèles gpt-oss) avant l'émission du JSON.
        console.warn(
          `[groq] JSON.parse KO — model=${model} finish_reason=${choice?.finish_reason ?? "?"} ` +
            `brut(200)="${text.slice(0, 200).replace(/\s+/g, " ").trim()}"`,
        );
        // On propage en marquant la cause "parse" (≠ 429 → compte comme tentative).
        (parseErr as GroqError).groqFailure = "parse";
        throw parseErr;
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
