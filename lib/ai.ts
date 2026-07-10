/**
 * Couche IA — Groq (API OpenAI-compatible).
 * Un seul point d'entrée pour tout l'enrichissement / briefing / résumé.
 * Sans GROQ_API_KEY : `hasGroq()` renvoie false et les appelants basculent
 * proprement en mode dégradé (aucune IA, pas de crash).
 *
 * Choix des modèles (tous gratuits sur le tier dev Groq) :
 *  - ENRICH : llama-3.3-70b-versatile — enrichissement de MASSE à l'ingestion.
 *    Non-reasoning → peu de tokens/appel → tient dans le budget tokens/minute
 *    (12k TPM, le plus haut). Qualité 70B suffisante pour classer + résumer.
 *  - SMART  : openai/gpt-oss-120b — briefing éditorial + résumé détaillé (drawer),
 *    faible volume, on peut se permettre un modèle à raisonnement plus fin.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODEL_ENRICH = "llama-3.3-70b-versatile";
// SMART = briefing / résumé drawer / Ask Radar. gpt-oss-120b a une limite
// quotidienne basse (200k tokens/j) vite épuisée par l'ingestion → on utilise
// llama-3.3-70b (quota bien plus large, qualité suffisante pour ces tâches).
export const GROQ_MODEL_SMART = "llama-3.3-70b-versatile";

export function hasGroq(): boolean {
  return !!process.env.GROQ_API_KEY;
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
  model = GROQ_MODEL_ENRICH,
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
      if (res.status === 429 && attempt < MAX_RETRY) {
        await sleep(retryDelayMs(res, attempt));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Groq HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      }
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
