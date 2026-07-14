import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { collectUserFeed } from "@/lib/sources";
import { enrichOutcome } from "@/lib/enrich";
import { embedDocumentHosted } from "@/lib/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Marge pour enrichir + embedder jusqu'à MAX_USER_FEED_ARTICLES dans la foulée.
export const maxDuration = 60;

// Cap d'articles enrichis en direct à l'ajout (timeouts Vercel ; le reste, s'il
// y en avait, serait de toute façon repris par le cron via enrich_status).
const MAX_USER_FEED_ARTICLES = 10;

// GET : sources globales actives (affichage lecture seule dans la vue Sources).
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ sources: [] });
  const { data } = await supabase
    .from("sources")
    .select("id,name,type,category")
    .eq("active", true)
    .order("name");
  return NextResponse.json({ sources: data ?? [] });
}

// POST : ajoute un flux RSS perso. Auth via Bearer token. Valide l'URL, récupère
// le nom auto du flux, collecte ses articles récents (bruts, sans IA), taggés au user.
export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "no_db" }, { status: 200 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let url = "";
  try {
    const body = await request.json();
    url = String(body.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "invalid_url" }, { status: 200 });

  const feed = await collectUserFeed(url);
  if (!feed) return NextResponse.json({ error: "invalid_feed" }, { status: 200 });

  // Enregistre la source perso (idempotent sur (user_id, url))
  const { error: sErr } = await supabase
    .from("user_sources")
    .upsert({ user_id: user.id, name: feed.name, url }, { onConflict: "user_id,url" });
  if (sErr) return NextResponse.json({ error: "save_failed", detail: sErr.message }, { status: 200 });

  // Enrichissement + embedding EN DIRECT (cap MAX_USER_FEED_ARTICLES), via la
  // même machine à états que le cron (ADR-0005). L'utilisateur voit ses articles
  // enrichis immédiatement au lieu d'attendre le prochain run.
  let okCount = 0;
  let pendingCount = 0;

  // Dédup par URL canonique (déjà canonique depuis collectUserFeed) + cap.
  const seen = new Set<string>();
  const candidates = feed.articles
    .filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)))
    .slice(0, MAX_USER_FEED_ARTICLES);

  // Ne pas "voler" un article déjà présent dans le corpus (global ou autre) :
  // on n'insère que les URLs réellement nouvelles (remplace ignoreDuplicates).
  const urls = candidates.map((a) => a.url);
  const { data: existing } = urls.length
    ? await supabase.from("articles").select("url").in("url", urls)
    : { data: [] as { url: string }[] };
  const known = new Set((existing ?? []).map((r: { url: string }) => r.url));
  const fresh = candidates.filter((a) => !known.has(a.url));

  for (const a of fresh) {
    const { e, ok, attempts, status } = await enrichOutcome(a, 0);
    const row = {
      id: a.id,
      source: a.source,
      title: a.title,
      url: a.url,
      author: a.author ?? null,
      points: a.points,
      comments: a.comments,
      published_at: a.publishedAt,
      category: e.category,
      tags: a.tags,
      snippet: a.snippet ?? null,
      image: a.image ?? null,
      heat: a.heat,
      summary: e.summary,
      summary_orig: e.summaryOrig,
      key_points: e.keyPoints,
      key_points_orig: e.keyPointsOrig,
      pullquote: e.pullquote,
      pullquote_orig: e.pullquoteOrig,
      why_it_matters: e.whyItMatters,
      enrich_status: status,
      enrich_attempts: attempts,
      user_id: user.id,
      fetched_at: new Date().toISOString(),
    };
    // Ligne AVANT embedding (FK article_embeddings→articles). Jamais onConflict:"id" (T4).
    const { error: aErr } = await supabase.from("articles").upsert(row, { onConflict: "url" });
    if (aErr) continue; // une ligne en échec ne casse pas tout l'ajout
    if (ok) {
      okCount++;
      // Embedding hébergé (HF) : l'ONNX local est trop lourd en serverless (ADR-0001).
      // Best-effort : un embed raté laisse l'article visible au feed, juste non
      // cherchable jusqu'à un re-embed manuel.
      try {
        const embedding = await embedDocumentHosted([a.title, a.snippet].filter(Boolean).join(". "));
        await supabase
          .from("article_embeddings")
          .upsert({ article_id: a.id, embedding }, { onConflict: "article_id" });
      } catch {
        /* embed best-effort */
      }
    } else {
      pendingCount++; // pending/failed : le cron retentera (Phase A)
    }
  }

  return NextResponse.json({
    name: feed.name,
    count: feed.articles.length,
    fresh: fresh.length,
    ok: okCount,
    pending: pendingCount,
  });
}
