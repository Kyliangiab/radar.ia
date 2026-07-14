import Parser from "rss-parser";
import type { Article, CategoryId } from "./types";
import { CATEGORY_MAP } from "./categories";
import type { FeedSource } from "./feeds";
import { getSupabase } from "./supabase";
import { canonicalUrl } from "./url";

const DEVTO_ENDPOINT = "https://dev.to/api/articles";

const WEEK_MS = 7 * 24 * 3600 * 1000;

// ── Fetch avec timeout court (une source lente ne bloque pas le flux) ──
async function safeFetch(url: string, ms = 6000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "Radar-Veille/1.0" },
      // Cache Next : on rafraîchit les données toutes les 10 min
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ── Dev.to ──
export async function fetchDevto(category: CategoryId): Promise<Article[]> {
  const def = CATEGORY_MAP[category];
  const tag = def.devtoTags[0];
  const url = tag
    ? `${DEVTO_ENDPOINT}?tag=${encodeURIComponent(tag)}&top=7&per_page=25`
    : `${DEVTO_ENDPOINT}?top=1&per_page=25`;
  const data = await safeFetch(url);
  const items: any[] = Array.isArray(data) ? data : [];
  return items
    .filter((a) => a.title && a.url)
    .map((a): Article => {
      const points = Number(a.positive_reactions_count ?? 0);
      const comments = Number(a.comments_count ?? 0);
      return {
        id: `dev-${a.id}`,
        title: String(a.title),
        url: a.url,
        source: "Dev.to",
        author: a.user?.name,
        points,
        comments,
        publishedAt: a.published_at ?? new Date().toISOString(),
        category,
        tags: Array.isArray(a.tag_list) ? a.tag_list : [],
        commentsUrl: a.url,
        snippet: a.description,
        image: a.cover_image || undefined,
        heat: 0,
      };
    });
}

// ── Heat : score relatif 0..100 sur une échelle log ──
function applyHeat(articles: Article[]): Article[] {
  if (articles.length === 0) return articles;
  const scores = articles.map((a) => Math.log10(a.points + a.comments * 1.5 + 1));
  const max = Math.max(...scores, 0.0001);
  return articles.map((a, i) => ({
    ...a,
    heat: Math.round((scores[i] / max) * 100),
  }));
}

// ── Agrégation : dédoublonnage + tri par mix fraîcheur / heat ──
export async function getFeed(category: CategoryId): Promise<Article[]> {
  const merged = await fetchDevto(category);

  // dédoublonnage par URL canonique (règle #5) ; l'article porte la forme canonique.
  const seen = new Set<string>();
  const unique = merged.filter((a) => {
    const key = canonicalUrl(a.url);
    if (seen.has(key)) return false;
    seen.add(key);
    a.url = key;
    return true;
  });

  const withHeat = applyHeat(unique);

  const now = Date.now();
  const scored = withHeat.map((a) => {
    const ageH = (now - new Date(a.publishedAt).getTime()) / 36e5;
    const freshness = Math.max(0, 100 - ageH * 2.2); // décote ~2.2 pts / heure
    const rank = a.heat * 0.6 + freshness * 0.4;
    return { a, rank };
  });

  scored.sort((x, y) => y.rank - x.rank);
  return scored.map((s) => s.a).slice(0, 40);
}

// ─────────────────────────────────────────────────────────────
//  SOURCES ADDITIONNELLES (RSS + API)
//  ⚠️ À n'appeler QUE depuis le pipeline d'ingestion (Node), jamais dans
//  getFeed() / une route serverless : le parsing RSS est lourd et bloquant.
// ─────────────────────────────────────────────────────────────

// Hash stable (djb2) → id déterministe pour dédoublonnage/upsert.
function hashId(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Les flux RSS n'ont pas d'upvotes : on donne un "heat" fondé sur la fraîcheur
// pour ne pas les faire systématiquement couler sous HN/PH dans le classement.
export function freshnessHeat(iso: string): number {
  const ageH = (Date.now() - new Date(iso).getTime()) / 36e5;
  return Math.round(Math.min(92, Math.max(20, 92 - ageH * 2.2))); // ~90 si < 6 h
}

function isRecent(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && Date.now() - t <= WEEK_MS;
}

function truncate(s: string | undefined, n = 300): string | undefined {
  if (!s) return undefined;
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + "…" : clean;
}

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  creator?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  categories?: string[];
  enclosure?: { url?: string };
  media?: { $?: { url?: string } };
  thumb?: { $?: { url?: string } };
};

let _rssParser: Parser<Record<string, unknown>, RssItem> | null = null;
function rssParser() {
  if (!_rssParser) {
    _rssParser = new Parser({
      timeout: 12000,
      headers: { "User-Agent": "Radar-Veille/1.0 (+veille techno)" },
      customFields: {
        item: [
          ["media:content", "media"],
          ["media:thumbnail", "thumb"],
          "enclosure",
        ],
      },
    });
  }
  return _rssParser;
}

/** Parse un flux RSS/Atom → Article[] (fenêtre 7 jours, heat = fraîcheur). */
export async function fetchRSS(feed: FeedSource): Promise<Article[]> {
  if (!feed.url) return [];
  let parsed;
  try {
    parsed = await rssParser().parseURL(feed.url);
  } catch {
    return []; // une source down ne casse pas l'ingestion
  }

  const out: Article[] = [];
  for (const item of parsed.items ?? []) {
    const title = item.title?.trim();
    const url = item.link?.trim();
    if (!title || !url) continue;

    const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
    if (!isRecent(publishedAt)) continue;

    const image =
      item.enclosure?.url || item.media?.$?.url || item.thumb?.$?.url || undefined;

    out.push({
      id: `rss-${hashId(item.guid || url)}`,
      title,
      url,
      source: feed.name,
      author: item.creator ?? feed.name,
      points: 0,
      comments: 0,
      publishedAt,
      category: feed.defaultCategory,
      tags: Array.isArray(item.categories) ? item.categories.slice(0, 6) : [],
      commentsUrl: url,
      snippet: truncate(item.contentSnippet),
      image,
      heat: freshnessHeat(publishedAt),
    });
  }
  return out;
}

// Nom de source lisible à partir du <title> du flux, sinon repli sur le hostname.
// Rejette les titres inexploitables (vides, tronqués "…", ou trop longs =
// titre d'article et non nom de source, cf. "Immobilier : Toute l'actualité…").
function cleanFeedName(rawTitle: string | undefined, host: string): string {
  const t = (rawTitle ?? "").replace(/\s+/g, " ").trim();
  const usable = t && t.length <= 60 && !/(?:…|\.\.\.)$/.test(t);
  return usable ? t : host || "Source RSS";
}

/**
 * Flux RSS ajouté par un utilisateur : parse une fois pour récupérer le NOM
 * auto (feed.title) + les articles récents. Renvoie null si l'URL n'est pas un
 * flux valide. Pas d'IA ici : l'enrichissement est fait par l'appelant
 * (/api/sources en direct, cap 10) ou le cron.
 */
export async function collectUserFeed(
  url: string,
): Promise<{ name: string; articles: Article[] } | null> {
  let parsed;
  try {
    parsed = await rssParser().parseURL(url);
  } catch {
    return null;
  }
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const name = cleanFeedName(parsed.title, host);
  const articles = await fetchRSS({ name, url, type: "rss", defaultCategory: "tech" });
  // URL canonique (règle #5) : clé de dédup/upsert cohérente en aval (T4/T8).
  for (const a of articles) a.url = canonicalUrl(a.url);
  return { name, articles };
}

/**
 * Product Hunt — API GraphQL V2. Skip proprement si PH_API_TOKEN absent.
 * L'API PH ne fait pas de recherche plein-texte : on liste les posts récents
 * les plus votés (suffisant pour une veille).
 */
export async function fetchProductHunt(): Promise<Article[]> {
  const token = process.env.PH_API_TOKEN;
  if (!token) return [];

  const query = `query { posts(order: VOTES, first: 20) { edges { node { id name tagline url votesCount commentsCount createdAt thumbnail { url } topics { edges { node { name } } } } } } }`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  let json: any = null;
  try {
    const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    json = await res.json();
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }

  const edges: any[] = json?.data?.posts?.edges ?? [];
  const out: Article[] = [];
  for (const e of edges) {
    const n = e?.node;
    if (!n?.name || !n?.url) continue;
    const createdAt = n.createdAt ?? new Date().toISOString();
    if (!isRecent(createdAt)) continue;

    const votes = Number(n.votesCount ?? 0);
    const comments = Number(n.commentsCount ?? 0);
    const heat = Math.round(
      Math.min(100, (Math.log10(votes + comments * 1.5 + 1) / Math.log10(1500)) * 100),
    );
    const topics: string[] = (n.topics?.edges ?? [])
      .map((te: any) => te?.node?.name)
      .filter(Boolean);

    out.push({
      id: `ph-${n.id}`,
      title: String(n.name),
      url: String(n.url),
      source: "Product Hunt",
      author: undefined,
      points: votes,
      comments,
      publishedAt: createdAt,
      category: "tech",
      tags: topics.slice(0, 6),
      commentsUrl: String(n.url),
      snippet: truncate(n.tagline),
      image: n.thumbnail?.url || undefined,
      heat,
    });
  }
  return out;
}

/**
 * NewsAPI — OPTIONNEL. Désactivé si NEWSAPI_KEY vide.
 * ⚠️ Le plan gratuit NewsAPI est limité à localhost/développement (100 req/j,
 * usage non commercial) : à réserver au dev, pas au déploiement de prod.
 */
export async function fetchNewsAPI(): Promise<Article[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  const url =
    "https://newsapi.org/v2/top-headlines?category=technology&language=fr&pageSize=20";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  let json: any = null;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "X-Api-Key": key, "User-Agent": "Radar-Veille/1.0" },
    });
    if (!res.ok) return [];
    json = await res.json();
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }

  const items: any[] = Array.isArray(json?.articles) ? json.articles : [];
  const out: Article[] = [];
  for (const a of items) {
    const title = a?.title?.trim();
    const link = a?.url?.trim();
    if (!title || !link) continue;
    const publishedAt = a.publishedAt ?? new Date().toISOString();
    if (!isRecent(publishedAt)) continue;
    out.push({
      id: `news-${hashId(link)}`,
      title,
      url: link,
      source: a.source?.name ? `NewsAPI · ${a.source.name}` : "NewsAPI",
      author: a.author ?? undefined,
      points: 0,
      comments: 0,
      publishedAt,
      category: "tech",
      tags: [],
      commentsUrl: link,
      snippet: truncate(a.description),
      image: a.urlToImage || undefined,
      heat: freshnessHeat(publishedAt),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  COLLECTE D'INGESTION — pilotée par la table `sources` (DB).
//  Une passe LARGE par source (pas de slice/tri d'affichage : c'est le rôle
//  du read). Un seul calcul de `heat` GLOBAL à la fin → échelle cohérente
//  entre toutes les sources (corrige le heat relatif-au-batch d'avant).
// ─────────────────────────────────────────────────────────────

type SourceRow = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  category: CategoryId;
  active: boolean;
};

// Catégories utilisées pour diversifier les recherches HN/Dev.to (Groq reclasse
// ensuite). "all" = front_page / top.
const COLLECT_CATS: CategoryId[] = ["all", "tech", "biz", "data", "ux"];

// Plafond d'articles retenus par source et par run (régime de tokens, ADR-0002).
// Dev.to = 5 tâches COLLECT_CATS partageant source="Dev.to" → sinon ~97 articles.
const MAX_ARTICLES_PER_SOURCE = Number(process.env.MAX_ARTICLES_PER_SOURCE) || 15;

// Garde au plus MAX_ARTICLES_PER_SOURCE articles par `source`, les plus « chauds »
// d'abord. L'ordre de sortie global n'est pas significatif (tri fait au read).
function capPerSource(articles: Article[]): Article[] {
  const bySource: Record<string, Article[]> = {};
  for (const a of articles) {
    (bySource[a.source] ??= []).push(a);
  }
  const out: Article[] = [];
  for (const source of Object.keys(bySource)) {
    const group = bySource[source];
    group.sort((x: Article, y: Article) => y.heat - x.heat);
    out.push(...group.slice(0, MAX_ARTICLES_PER_SOURCE));
  }
  return out;
}

async function getActiveSources(): Promise<SourceRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("sources").select("*").eq("active", true);
  return (data ?? []) as SourceRow[];
}

// Heat unique 0..100 recalculé sur TOUT le corpus collecté.
// Signal (votes/comm.) → log-normalisé globalement ; sources sans votes
// (RSS/News) → repli sur la fraîcheur, sur la même échelle.
// ponytail: heuristique globale ; si on veut du par-source, passer en percentile.
function applyGlobalHeat(articles: Article[]): Article[] {
  const logs = articles.map((a) => Math.log10(a.points + a.comments * 1.5 + 1));
  const max = Math.max(...logs, 0.0001);
  return articles.map((a, i) => {
    const signal = a.points + a.comments * 1.5;
    const heat = signal > 0 ? Math.round((logs[i] / max) * 100) : freshnessHeat(a.publishedAt);
    return { ...a, heat };
  });
}

/**
 * Collecte d'ingestion : lit les sources actives en DB, interroge chacune une
 * fois (large), dédoublonne par URL, applique un heat global. Aucun tri/slice.
 * Chaque source échoue silencieusement (→ []) sans bloquer les autres.
 */
export async function collectAll(): Promise<Article[]> {
  const sources = await getActiveSources();

  const tasks: Promise<Article[]>[] = [];
  for (const s of sources) {
    switch (s.type) {
      case "devto":
        tasks.push(...COLLECT_CATS.map((c) => fetchDevto(c)));
        break;
      case "rss":
        if (s.url)
          tasks.push(
            fetchRSS({
              name: s.name,
              url: s.url,
              type: "rss",
              defaultCategory: s.category as FeedSource["defaultCategory"],
            }),
          );
        break;
      case "producthunt":
        tasks.push(fetchProductHunt());
        break;
      case "newsapi":
        tasks.push(fetchNewsAPI());
        break;
    }
  }

  const all = (await Promise.all(tasks)).flat();

  // dédoublonnage par URL canonique (règle #5) ; l'article porte la forme canonique
  // → détection `fresh` et upsert `onConflict:"url"` cohérents en aval (T4).
  const seen = new Set<string>();
  const unique = all.filter((a) => {
    const key = canonicalUrl(a.url);
    if (seen.has(key)) return false;
    seen.add(key);
    a.url = key;
    return true;
  });

  return capPerSource(applyGlobalHeat(unique));
}
