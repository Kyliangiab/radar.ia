export type CategoryId = "all" | "tech" | "biz" | "data" | "ux" | "autre";

// Vues de l'app : le fil (défaut), le brief, récents, enregistrés, tendances, sources.
export type FluxView = "fil" | "brief" | "recents" | "enregistres" | "tendances" | "sources";
// Tri du fil : plus récents / plus pertinents (heat).
export type FeedSort = "recent" | "hot";
// Densité d'affichage du fil (design 4a) : cartes (Confort) ou liste (Compact).
export type Density = "confort" | "compact";

// Étiquette de source affichée. Sources historiques : "HN" | "Dev.to".
// Élargi à string pour accueillir les flux RSS / API additionnels
// (TechCrunch, The Verge, Product Hunt, Le Monde, …).
export type SourceId = string;

export interface Article {
  id: string;
  title: string;
  url: string;
  source: SourceId;
  author?: string;
  points: number;
  comments: number;
  publishedAt: string; // ISO
  category: CategoryId;
  tags: string[];
  commentsUrl?: string;
  snippet?: string;
  image?: string;
  heat: number; // 0..100 (signal relatif)
  summary?: string; // résumé IA en français (si déjà stocké)
  summaryOrig?: string; // résumé IA en langue d'origine (pour le mode VO)
  keyPoints?: string[]; // 3 points clés (FR) — stockés à l'ingestion
  keyPointsOrig?: string[]; // 3 points clés (langue d'origine)
  pullquote?: string; // punchline "à ressortir en réunion" (FR)
  pullquoteOrig?: string; // punchline (langue d'origine)
  whyItMatters?: string; // "pourquoi c'est important" IA
}

export interface Trend {
  title: string;
  why: string;
}

export interface Briefing {
  headline: string;
  trends: Trend[];
  watch: string;
}

export interface Summary {
  summary: string;
  whyItMatters: string;
  points?: string[]; // 2-3 points clés (drawer détail)
  pullquote?: string; // punchline "à ressortir en réunion"
}
