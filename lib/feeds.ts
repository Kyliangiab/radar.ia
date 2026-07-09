/**
 * Config des sources additionnelles (RSS + API) collectées par le pipeline
 * d'ingestion (scripts/ingest.ts) — JAMAIS par une route serverless.
 *
 * `defaultCategory` n'est qu'un fallback de tri : à l'enrichissement, l'IA (Groq)
 * reclasse chaque article dans le bon domaine (tech | biz | data | ux).
 * URLs vérifiées au 07/2026.
 */
export interface FeedSource {
  name: string;
  type: "rss" | "producthunt";
  url?: string; // pour type "rss"
  defaultCategory: "tech" | "biz" | "data" | "ux";
  lang?: "fr" | "en";
}

export const FEEDS: FeedSource[] = [
  // ── RSS ──
  { name: "TechCrunch",        type: "rss", url: "https://techcrunch.com/feed/",                                   defaultCategory: "biz",  lang: "en" }, // full-text
  { name: "TechCrunch AI",     type: "rss", url: "https://techcrunch.com/category/artificial-intelligence/feed/", defaultCategory: "data", lang: "en" },
  { name: "The Verge",         type: "rss", url: "https://www.theverge.com/rss/index.xml",                         defaultCategory: "tech", lang: "en" }, // extraits
  { name: "VentureBeat",       type: "rss", url: "https://venturebeat.com/feed/",                                  defaultCategory: "data", lang: "en" },
  { name: "Smashing Magazine", type: "rss", url: "https://www.smashingmagazine.com/feed/",                         defaultCategory: "ux",   lang: "en" }, // couvre le domaine UX
  { name: "Le Monde Pixels",   type: "rss", url: "https://www.lemonde.fr/pixels/rss_full.xml",                     defaultCategory: "tech", lang: "fr" },
  { name: "Le Monde IA",       type: "rss", url: "https://www.lemonde.fr/intelligence-artificielle/rss_full.xml", defaultCategory: "data", lang: "fr" },
  // ── API ──
  { name: "Product Hunt",      type: "producthunt",                                                                defaultCategory: "tech", lang: "en" },
];
