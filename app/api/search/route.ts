import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { embedQuery } from "@/lib/embeddings";
import type { Article, CategoryId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: CategoryId[] = ["all", "tech", "biz", "data", "ux"];

function mapRow(r: any): Article & { similarity?: number } {
  return {
    id: r.id, title: r.title, url: r.url, source: r.source,
    author: r.author ?? undefined, points: r.points ?? 0, comments: r.comments ?? 0,
    publishedAt: r.published_at, category: r.category, tags: r.tags ?? [],
    commentsUrl: r.url, snippet: r.snippet ?? undefined, image: r.image ?? undefined,
    heat: r.heat ?? 0, summary: r.summary ?? undefined, whyItMatters: r.why_it_matters ?? undefined,
    similarity: typeof r.similarity === "number" ? r.similarity : undefined,
  };
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "no_db", articles: [] }, { status: 200 });
  }

  let query = "";
  let category: CategoryId = "all";
  try {
    const body = await request.json();
    query = String(body.query ?? "").trim();
    if (VALID.includes(body.category)) category = body.category;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!query) return NextResponse.json({ articles: [] }, { status: 200 });

  // Recherche sémantique : embedding de la requête (HF) → match_articles (cosinus).
  try {
    const embedding = await embedQuery(query);
    const { data, error } = await supabase.rpc("match_articles", {
      query_embedding: embedding,
      match_count: 24,
      filter_category: category === "all" ? null : category,
    });
    if (error) throw error;
    return NextResponse.json({ count: data?.length ?? 0, articles: (data ?? []).map(mapRow) });
  } catch (e: any) {
    return NextResponse.json({ error: "search_failed", detail: e?.message ?? null, articles: [] }, { status: 200 });
  }
}
