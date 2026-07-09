/**
 * Couche IA — Groq (API OpenAI-compatible).
 * Un seul point d'entrée pour tout l'enrichissement / briefing / résumé.
 * Sans GROQ_API_KEY : `hasGroq()` renvoie false et les appelants basculent
 * proprement en mode dégradé (aucune IA, pas de crash).
 *
 * Modèles Groq (rapides, gratuits sur le tier dev). On cible les modèles ACTIFS
 * `openai/gpt-oss-*` : les modèles Llama de Groq (llama-3.x) sont en dépréciation.
 *  - FAST  : classification + résumés unitaires (volume élevé à l'ingestion)
 *  - SMART : briefing éditorial (raisonnement un peu plus fin)
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODEL_FAST = "openai/gpt-oss-20b";
export const GROQ_MODEL_SMART = "openai/gpt-oss-120b";

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

/**
 * Appelle Groq en mode JSON strict et renvoie l'objet parsé.
 * `response_format: json_object` force une sortie JSON valide (les prompts
 * contiennent tous le mot « JSON », requis par l'API).
 * Renvoie null si la clé manque. Lève en cas d'erreur réseau/HTTP (l'appelant
 * catch et retombe sur son fallback).
 */
export async function groqJSON<T>({
  system,
  user,
  model = GROQ_MODEL_FAST,
  maxTokens = 800,
  temperature = 0.4,
  reasoningEffort = "low",
}: GroqOpts): Promise<T | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        // gpt-oss = modèles à raisonnement : sans effort "low", tout le budget
        // de tokens part en reasoning et le JSON n'est jamais émis (json_validate_failed).
        reasoning_effort: reasoningEffort,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
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
