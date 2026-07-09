import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Embeddings 100 % locaux (aucune clé externe).
 * Modèle : multilingual-e5-small (384 dims) — gère le FR↔EN, idéal pour une
 * plateforme francophone qui indexe du contenu majoritairement anglais.
 *
 * e5 exige des préfixes : "query: " pour les recherches, "passage: " pour les
 * documents stockés. Si tu changes de modèle, adapte VECTOR_DIM (migration) et
 * la logique de préfixe.
 */
export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const VECTOR_DIM = 384;

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

/** Embedding d'un document à stocker (ingestion). */
export function embedDocument(text: string): Promise<number[]> {
  return run(`passage: ${text.slice(0, 1200)}`);
}

/** Embedding d'une requête de recherche. */
export function embedQuery(text: string): Promise<number[]> {
  return run(`query: ${text.slice(0, 512)}`);
}
