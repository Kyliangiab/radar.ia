import type { CategoryId } from "./types";

// Sources réellement interrogées par le pipeline (lib/feeds.ts + lib/sources.ts).
// Utilisé par la vue "Sources" (affichage + toggle actif/pause côté client).
export interface SourceConfig {
  id: string;
  name: string;
  type: string;
  category: CategoryId;
  active: boolean;
}

export const SOURCES: SourceConfig[] = [
  { id: "hn", name: "Hacker News", type: "API · Ingénierie", category: "tech", active: true },
  { id: "devto", name: "Dev.to", type: "API · Tech & UX", category: "tech", active: true },
  { id: "techcrunch", name: "TechCrunch", type: "RSS · Business", category: "biz", active: true },
  { id: "tcai", name: "TechCrunch AI", type: "RSS · Data / IA", category: "data", active: true },
  { id: "verge", name: "The Verge", type: "RSS · Tech", category: "tech", active: true },
  { id: "vb", name: "VentureBeat", type: "RSS · Data / IA", category: "data", active: true },
  { id: "smashing", name: "Smashing Magazine", type: "RSS · UX / Design", category: "ux", active: true },
  { id: "lemonde", name: "Le Monde (Pixels + IA)", type: "RSS · Généraliste FR", category: "tech", active: true },
  { id: "ph", name: "Product Hunt", type: "API · Lancements", category: "tech", active: false },
  { id: "newsapi", name: "NewsAPI", type: "API · Headlines (opt.)", category: "tech", active: false },
];

export const FREQUENCIES = ["Temps réel", "Toutes les heures", "2× / jour", "Quotidien"];
