import { NextResponse } from "next/server";
import { getFeed } from "@/lib/sources";
import { getSupabase } from "@/lib/supabase";
import type { Article, CategoryId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: CategoryId[] = ["all", "tech", "biz", "data", "ux"];

// Ligne DB → forme Article de l'app
function mapRow(r: any): Article {
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    author: r.author ?? undefined,
    points: r.points ?? 0,
    comments: r.comments ?? 0,
    publishedAt: r.published_at,
    category: r.category,
    tags: r.tags ?? [],
    commentsUrl: r.url,
    snippet: r.snippet ?? undefined,
    image: r.image ?? undefined,
    heat: r.heat ?? 0,
    summary: r.summary ?? undefined,
    whyItMatters: r.why_it_matters ?? undefined,
  };
}

// Re-classement fraîcheur × signal (comme le pipeline)
function rank(articles: Article[]): Article[] {
  const now = Date.now();
  return [...articles]
    .map((a) => {
      const ageH = (now - new Date(a.publishedAt).getTime()) / 36e5;
      const freshness = Math.max(0, 100 - ageH * 2.2);
      return { a, r: a.heat * 0.6 + freshness * 0.4 };
    })
    .sort((x, y) => y.r - x.r)
    .map((s) => s.a)
    .slice(0, 40);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("category") ?? "all") as CategoryId;
  const category = VALID.includes(raw) ? raw : "all";

  const supabase = getSupabase();

  // Source de vérité : la base (restitution du pipeline)
  if (supabase) {
    try {
      let q = supabase.from("articles").select("*").order("published_at", { ascending: false }).limit(80);
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        return NextResponse.json({ category, source: "db", count: data.length, articles: rank(data.map(mapRow)) });
      }
    } catch {
      /* bascule en live ci-dessous */
    }
  }

  // Fallback dégradé : fetch live (avant la 1re ingestion / sans base)
  try {
    const articles = await getFeed(category);
    return NextResponse.json({ category, source: "live", count: articles.length, articles });
  } catch {
    return NextResponse.json({ category, source: "none", count: 0, articles: [] }, { status: 200 });
  }
}
