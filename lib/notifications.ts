"use client";

import type { Article, Briefing, CategoryId } from "./types";
import { CATEGORY_MAP } from "./categories";
import type { StatsResp } from "./stats";

export type Notif = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  when: string;
  color: string;
};

/**
 * Notifications dérivées des VRAIES données (brief généré, variations de volume,
 * source la plus active, fiches enregistrées). Aucune donnée inventée : si
 * l'historique manque, on retombe sur le domaine dominant du jour.
 */
export function buildNotifications(opts: {
  articles: Article[];
  briefing: Briefing | null;
  stats: StatsResp | null;
  savedCount: number;
}): Notif[] {
  const { articles, briefing, stats, savedCount } = opts;
  const notifs: Notif[] = [];

  if (briefing?.trends?.length) {
    notifs.push({
      id: "brief-ready",
      icon: "✦",
      title: "Ton brief du jour est prêt",
      sub: `${briefing.trends.length} tendances · ${articles.length} articles analysés`,
      when: "aujourd'hui",
      color: "#FF5A47",
    });
  }

  // Sujet en accélération — vraie variation si l'historique existe.
  if (stats?.hasHistory) {
    const top = stats.topics
      .filter((t) => t.variation > 0)
      .sort((a, b) => b.variation - a.variation)[0];
    if (top) {
      notifs.push({
        id: `rise-${top.topic}`,
        icon: "↑",
        title: "Sujet en accélération",
        sub: `« ${top.label} » · +${top.variation}% cette semaine`,
        when: "cette semaine",
        color: "#4E8D6E",
      });
    }
  } else {
    const counts: Record<string, number> = {};
    for (const a of articles) counts[a.category] = (counts[a.category] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0) {
      notifs.push({
        id: `dom-${top[0]}`,
        icon: "↑",
        title: "Sujet dominant du jour",
        sub: `${CATEGORY_MAP[top[0] as CategoryId]?.label ?? top[0]} · ${top[1]} articles`,
        when: "aujourd'hui",
        color: "#4E8D6E",
      });
    }
  }

  // Source la plus active du jour.
  const bySource: Record<string, number> = {};
  for (const a of articles) bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  const src = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0];
  if (src && src[1] > 1) {
    notifs.push({
      id: `src-${src[0]}`,
      icon: "⧉",
      title: `${src[0]} a publié ${src[1]} articles`,
      sub: "à revoir dans ton fil",
      when: "aujourd'hui",
      color: "#8E5FB8",
    });
  }

  if (savedCount > 0) {
    notifs.push({
      id: "saved",
      icon: "★",
      title: `${savedCount} fiche${savedCount > 1 ? "s" : ""} enregistrée${savedCount > 1 ? "s" : ""}`,
      sub: "Retrouve-les dans Enregistrés",
      when: "",
      color: "#C8663A",
    });
  }

  return notifs;
}
