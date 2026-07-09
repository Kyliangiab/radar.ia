import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { collectUserFeed } from "@/lib/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Articles bruts taggés au user. ignoreDuplicates : ne vole pas un article
  // déjà présent dans le corpus global. Le cron quotidien enrichira (résumé + embed).
  if (feed.articles.length) {
    const rows = feed.articles.map((a) => ({
      id: a.id,
      source: a.source,
      title: a.title,
      url: a.url,
      author: a.author ?? null,
      points: a.points,
      comments: a.comments,
      published_at: a.publishedAt,
      category: a.category,
      tags: a.tags,
      snippet: a.snippet ?? null,
      image: a.image ?? null,
      heat: a.heat,
      summary: null,
      why_it_matters: null,
      user_id: user.id,
      fetched_at: new Date().toISOString(),
    }));
    await supabase.from("articles").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  }

  return NextResponse.json({ name: feed.name, count: feed.articles.length });
}
