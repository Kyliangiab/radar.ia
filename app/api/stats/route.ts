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
  const base = { hasHistory: false, overallVariation: 0, series: [] as { day: string; count: number }[], topics: [] as unknown[] };

  const supabase = getSupabase();
  if (!supabase)
    return NextResponse.json({ ...base, articleCount: 0, headline: null, panels: [], ingestDays: 0, lastFetchedAt: null });

  // ── Données de l'écran d'auth (toujours calculées, publiques) ──
  //  · articleCount : total réel d'articles analysés
  //  · headline     : dernier titre analysé (hero)
  //  · panels       : 3 domaines les plus actifs + dernier titre de chacun
  const { count: articleCount } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true });
  const { data: recent } = await supabase
    .from("articles")
    .select("title,category,heat,published_at")
    .order("heat", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(80);
  const rec = (recent ?? []) as { title: string; category: string }[];
  const headline = rec[0]?.title ?? null;
  const byCat = new Map<string, { count: number; top: string }>();
  for (const a of rec) {
    const c = a.category || "autre";
    const e = byCat.get(c);
    if (e) {
      e.count++;
      // Garde le meilleur titre du domaine ≠ hero (évite la redite).
      if ((!e.top || e.top === headline) && a.title !== headline) e.top = a.title;
    } else {
      byCat.set(c, { count: 1, top: a.title });
    }
  }
  const panels = Array.from(byCat.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([cat, v], i) => ({
      n: String(i + 1).padStart(2, "0"),
      topic: cat,
      label: CATEGORY_MAP[cat as CategoryId]?.label ?? cat,
      color: CATEGORY_MAP[cat as CategoryId]?.color ?? "#FF5A47",
      desc: v.top && v.top !== headline ? v.top : `${v.count} article${v.count > 1 ? "s" : ""} cette semaine`,
    }));
  // ── Métadonnées d'honnêteté (T10) ──
  //  · ingestDays  : nb de jours d'ingestion RÉELS (snapshots distincts) → Nº d'édition.
  //  · lastFetchedAt : dernière collecte réelle (max fetched_at) → "il y a Xh".
  const { data: allDays } = await supabase.from("daily_topic_volume").select("day");
  const ingestDays = new Set((allDays ?? []).map((r: { day: string }) => r.day)).size;
  const { data: lastRow } = await supabase
    .from("articles")
    .select("fetched_at")
    .not("fetched_at", "is", null)
    .order("fetched_at", { ascending: false })
    .limit(1);
  const lastFetchedAt = lastRow?.[0]?.fetched_at ?? null;

  const authData = { articleCount: articleCount ?? 0, headline, panels, ingestDays, lastFetchedAt };

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
  if (days.length < 2) return NextResponse.json({ ...base, ...authData });

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
    ...authData,
  });
}
