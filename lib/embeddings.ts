import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Embeddings 100 % locaux (aucune clé externe).
 * Modèle : multilingual-e5-base (768 dims) — gère le FR↔EN, idéal pour une
 * plateforme francophone qui indexe du contenu majoritairement anglais.
 *
 * e5 exige des préfixes : "query: " pour les recherches, "passage: " pour les
 * documents stockés. Si tu changes de modèle, adapte VECTOR_DIM (migration) et
 * la logique de préfixe.
 */
export const EMBEDDING_MODEL = "Xenova/multilingual-e5-base";
export const VECTOR_DIM = 768;

let _pipe: Promise<FeatureExtractionPipeline> | null = null;

function getPipe(): Promise<FeatureExtractionPipeline> {
  if (!_pipe) {
    _pipe = pipeline("feature-extraction", EMBEDDING_MODEL);
  }
  return _pipe;
}

async function run(text: string): Promise<number[]> {
  const pipe = await getPipe();
  const out = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

/** Embedding d'un document à stocker (ingestion, modèle LOCAL — script Node, à chaud). */
export function embedDocument(text: string): Promise<number[]> {
  return run(`passage: ${text.slice(0, 1200)}`);
}

// Embedding HÉBERGÉ via HF Inference API — même modèle e5-base que l'embedding
// local (→ vecteurs comparables), ~200 ms au lieu du cold-start ONNX local
// (~minutes en serverless). Sert la recherche ET l'ajout de flux perso
// (/api/sources), routes serverless où l'ONNX local est trop lourd (ADR-0001).
const HF_EMBED_URL =
  "https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-base/pipeline/feature-extraction";

// e5 exige un préfixe : "query: " pour les requêtes, "passage: " pour les docs.
async function hfEmbed(prefixed: string): Promise<number[]> {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("HUGGINGFACE_API_KEY manquant");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(HF_EMBED_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prefixed }),
    });
    if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text().catch(() => "")}`);
    const vec = await res.json();
    if (!Array.isArray(vec) || typeof vec[0] !== "number") {
      throw new Error("HF: réponse d'embedding inattendue");
    }
    return vec as number[];
  } finally {
    clearTimeout(timer);
  }
}

/** Embedding d'une requête de recherche (hébergé HF). */
export function embedQuery(text: string): Promise<number[]> {
  return hfEmbed(`query: ${text.slice(0, 512)}`);
}

/** Embedding d'un document (hébergé HF) — pour les routes serverless (ex.
 * /api/sources). Vecteurs compatibles avec `embedDocument` local (même modèle). */
export function embedDocumentHosted(text: string): Promise<number[]> {
  return hfEmbed(`passage: ${text.slice(0, 1200)}`);
}
