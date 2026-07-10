import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { CATEGORY_MAP } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { day: string; topic: string; count: number };

// GET : variations de volume par domaine à partir de l'historique quotidien
// (daily_topic_volume). Compare les 7 derniers jours aux 7 précédents.
// `hasHistory` = faux tant qu'il n'y a pas ≥ 2 jours de snapshots → le client
// retombe alors sur l'illustratif.
export async function GET() {
  const empty = { hasHistory: false, overallVariation: 0, series: [] as { day: string; count: number }[], topics: [] as unknown[] };

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json(empty);

  // 14 jours suffisent pour "cette semaine vs semaine passée".
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 13);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("daily_topic_volume")
    .select("day,topic,count")
    .gte("day", sinceStr)
    .order("day", { ascending: true });

  const rows = (data ?? []) as Row[];
  const days = Array.from(new Set(rows.map((r) => r.day))).sort();
  if (days.length < 2) return NextResponse.json(empty);

  // Bornes : 7 derniers jours vs 7 précédents (par date, pas par index).
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 6);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const isRecent = (day: string) => day >= cutoffStr;

  const topicMap = new Map<string, { last7: number; prev7: number }>();
  const seriesMap = new Map<string, number>();
  for (const r of rows) {
    const t = topicMap.get(r.topic) ?? { last7: 0, prev7: 0 };
    if (isRecent(r.day)) t.last7 += r.count;
    else t.prev7 += r.count;
    topicMap.set(r.topic, t);
    if (isRecent(r.day)) seriesMap.set(r.day, (seriesMap.get(r.day) ?? 0) + r.count);
  }

  const variation = (last: number, prev: number) =>
    prev > 0 ? Math.round(((last - prev) / prev) * 100) : last > 0 ? 100 : 0;

  const topics = Array.from(topicMap.entries())
    .map(([topic, v]) => ({
      topic,
      label: CATEGORY_MAP[topic as CategoryId]?.label ?? topic,
      last7: v.last7,
      prev7: v.prev7,
      variation: variation(v.last7, v.prev7),
    }))
    .sort((a, b) => b.variation - a.variation);

  const totalLast = topics.reduce((s, t) => s + t.last7, 0);
  const totalPrev = topics.reduce((s, t) => s + t.prev7, 0);

  const series = Array.from(seriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }));

  return NextResponse.json({
    hasHistory: true,
    overallVariation: variation(totalLast, totalPrev),
    series,
    topics,
  });
}
