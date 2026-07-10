export type CategoryId = "all" | "tech" | "biz" | "data" | "ux";

// Vues de l'app : le fil (défaut), le brief du jour, les enregistrés, les sources.
export type FluxView = "fil" | "brief" | "enregistres" | "sources";
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
  summary?: string; // résumé IA (si déjà stocké)
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
