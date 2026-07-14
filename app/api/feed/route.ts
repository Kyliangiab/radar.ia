import { NextResponse } from "next/server";
import { getFeed } from "@/lib/sources";
import { getSupabase } from "@/lib/supabase";
import type { Article, CategoryId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: CategoryId[] = ["all", "tech", "biz", "data", "ux"];

// Construit une liste PostgREST `("a","b")` pour `.not("source","in", …)` :
// chaque nom entre guillemets doubles, tout `"` interne doublé (convention
// PostgREST). Renvoie null si la liste est vide (→ ne pas appliquer le filtre).
function pgInList(names: string[]): string | null {
  if (names.length === 0) return null;
  return "(" + names.map((n) => `"${n.replace(/"/g, '""')}"`).join(",") + ")";
}

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
    keyPoints: r.key_points ?? undefined,
    keyPointsOrig: r.key_points_orig ?? undefined,
    pullquote: r.pullquote ?? undefined,
    pullquoteOrig: r.pullquote_orig ?? undefined,
    whyItMatters: r.why_it_matters ?? undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("category") ?? "all") as CategoryId;
  const category = VALID.includes(raw) ? raw : "all";

  const supabase = getSupabase();

  // uid dérivé de la SESSION serveur (T9) : le `?uid=` est ignoré (sinon
  // n'importe qui lit le feed perso d'un autre). Sans Bearer → global seul.
  let validUid: string | null = null;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supabase && token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    validUid = user?.id ?? null;
  }

  // Source de vérité : la base (restitution du pipeline).
  // NB : on fait DEUX requêtes (corpus global user_id null + articles perso du
  // user) plutôt qu'un `.or(user_id.is.null,user_id.eq.…)` — ce dernier ne
  // remontait pas les persos en prod (parsing PostgREST capricieux sur l'UUID).
  if (supabase) {
    try {
      // Sources archivées par CET utilisateur (removed=true) → on masque leurs
      // articles de SON feed, sans toucher le corpus (masquage per-user, RLS).
      // `articles` n'a pas de source_id : on résout id→NOM (le seul lien est le
      // champ texte `source`). Globales via `sources`, perso via `user_sources`.
      let removedGlobalNames: string[] = [];
      let removedUserNames: string[] = [];
      if (validUid) {
        const { data: prefs } = await supabase
          .from("user_source_prefs")
          .select("source_id")
          .eq("user_id", validUid)
          .eq("removed", true);
        const removedIds = (prefs ?? []).map((p: { source_id: string }) => p.source_id);
        if (removedIds.length > 0) {
          const [g, u] = await Promise.all([
            supabase.from("sources").select("name").in("id", removedIds),
            supabase
              .from("user_sources")
              .select("name")
              .in("id", removedIds)
              .eq("user_id", validUid),
          ]);
          removedGlobalNames = (g.data ?? []).map((r: { name: string }) => r.name);
          removedUserNames = (u.data ?? []).map((r: { name: string }) => r.name);
        }
      }

      const base = () => {
        // Gate ADR-0005 : seuls les articles enrichis (enrich_status='ok') sont
        // servis. Aucune exception — jamais de carte vide au feed.
        let qq = supabase
          .from("articles")
          .select("*")
          .eq("enrich_status", "ok")
          .order("published_at", { ascending: false });
        if (category !== "all") qq = qq.eq("category", category);
        return qq;
      };
      // Filtre PostgREST (pas de post-filtrage JS, cf. gate T3). Noms globaux sur
      // la requête globale, noms perso sur la requête perso → pas de collision.
      const globalExcl = pgInList(removedGlobalNames);
      let globalQ = base().is("user_id", null);
      if (globalExcl) globalQ = globalQ.not("source", "in", globalExcl);
      const globalRes = await globalQ.limit(300);
      let rows = globalRes.data ?? [];
      if (validUid) {
        const userExcl = pgInList(removedUserNames);
        let userQ = base().eq("user_id", validUid);
        if (userExcl) userQ = userQ.not("source", "in", userExcl);
        const userRes = await userQ.limit(100);
        if (userRes.data?.length) rows = [...userRes.data, ...rows];
      }
      if (!globalRes.error && rows.length > 0) {
        return NextResponse.json({ category, source: "db", count: rows.length, articles: rows.map(mapRow) });
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
