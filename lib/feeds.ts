/**
 * Type d'une source de flux, consommé par `fetchRSS` (lib/sources.ts).
 * La LISTE des sources n'est plus ici : elle vit en base (table `sources`,
 * migration 0003) et est lue à l'ingestion par `collectAll()`.
 */
export interface FeedSource {
  name: string;
  type: "rss" | "producthunt";
  url?: string; // pour type "rss"
  defaultCategory: "tech" | "biz" | "data" | "ux";
  lang?: "fr" | "en";
}
