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
    summaryOrig: r.summary_orig ?? undefined,
    whyItMatters: r.why_it_matters ?? undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("category") ?? "all") as CategoryId;
  const category = VALID.includes(raw) ? raw : "all";
  // uid (session) → on ajoute les articles des sources perso du user au corpus
  // global. ponytail: contenu RSS public, filtre best-effort (pas de secret ici).
  const uid = searchParams.get("uid");
  const validUid = uid && /^[0-9a-f-]{36}$/i.test(uid) ? uid : null;

  const supabase = getSupabase();

  // Source de vérité : la base (restitution du pipeline)
  if (supabase) {
    try {
      // Tri/filtre côté client (toggle Récents/Pertinence) → on renvoie large,
      // ordonné par date. Pas de re-rank ni de slice ici.
      let q = supabase.from("articles").select("*").order("published_at", { ascending: false }).limit(300);
      // corpus global (user_id null) + sources perso du user
      q = validUid ? q.or(`user_id.is.null,user_id.eq.${validUid}`) : q.is("user_id", null);
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        return NextResponse.json({ category, source: "db", count: data.length, articles: data.map(mapRow) });
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
