"use client";

/** Réponse de /api/stats (variations de volume par domaine). Type partagé. */
export type StatsResp = {
  hasHistory: boolean;
  overallVariation: number;
  series: { day: string; count: number }[];
  topics: { topic: string; label: string; last7: number; prev7: number; variation: number }[];
  // Données publiques pour l'écran d'auth.
  articleCount?: number;
  headline?: string | null;
  panels?: { n: string; topic: string; label: string; color: string; desc: string }[];
  // Honnêteté (T10) : Nº d'édition = jours d'ingestion réels ; dernière collecte.
  ingestDays?: number;
  lastFetchedAt?: string | null;
};

export async function fetchStats(): Promise<StatsResp | null> {
  try {
    const r = await fetch("/api/stats");
    return (await r.json()) as StatsResp;
  } catch {
    return null;
  }
}
