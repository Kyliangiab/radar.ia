"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Article, Briefing, CategoryId, FeedSort, FluxView } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { Feed } from "@/components/Feed";
import { BriefBanner } from "@/components/BriefBanner";
import { ArticleDrawer } from "@/components/ArticleDrawer";
import { AuthScreen } from "@/components/AuthScreen";
import type { AccountUser } from "@/components/Sidebar";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { listSaved, addSaved, removeSaved } from "@/lib/saved";
import type { Session } from "@supabase/supabase-js";
import { BriefView } from "@/components/views/BriefView";
import { SourcesView } from "@/components/views/SourcesView";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "R";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

const FEED_VIEWS: FluxView[] = ["fil", "enregistres"];
const TITLES: Record<string, string> = {
  fil: "Le fil",
  enregistres: "Mes fiches",
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [flux, setFlux] = useState<FluxView>("fil");
  const [domain, setDomain] = useState<CategoryId>("all");
  const [sort, setSort] = useState<FeedSort>("recent");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [results, setResults] = useState<Article[] | null>(null);
  const [query, setQuery] = useState("");

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const briefRequested = useRef(false);

  // ── Chargement du flux ──
  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?category=all&uid=${uid}`, { cache: "no-store" });
      const data = await res.json();
      setArticles(Array.isArray(data.articles) ? data.articles : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (session) load(session.user.id);
  }, [session, load]);

  // ── Auth Supabase (Google OAuth, session réelle) ──
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setAuthChecked(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const account = useMemo<AccountUser | null>(() => {
    const u = session?.user;
    if (!u) return null;
    const name =
      (u.user_metadata?.full_name as string) ||
      (u.user_metadata?.name as string) ||
      u.email ||
      "Utilisateur";
    return { name, email: u.email ?? undefined, initials: initialsOf(name) };
  }, [session]);

  const logout = useCallback(async () => {
    await getSupabaseBrowser()?.auth.signOut();
    setArticles([]);
    setBriefing(null);
    briefRequested.current = false;
  }, []);

  // ── Enregistrés (persistés en base, RLS par utilisateur) ──
  useEffect(() => {
    if (!session) {
      setSaved(new Set());
      return;
    }
    listSaved().then(setSaved);
  }, [session]);
  const toggleSave = useCallback(
    (id: string) => {
      const uid = session?.user.id;
      if (!uid) return;
      setSaved((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          removeSaved(id);
        } else {
          next.add(id);
          addSaved(uid, id);
        }
        return next;
      });
    },
    [session],
  );

  // ── Briefing (auto-généré une fois) ──
  const generateBriefing = useCallback(
    async (list: Article[]) => {
      if (briefingLoading || list.length === 0) return;
      setBriefingLoading(true);
      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articles: list.slice(0, 22).map((a) => ({
              title: a.title,
              source: a.source,
              category: a.category,
              points: a.points,
              comments: a.comments,
            })),
          }),
        });
        const data = await res.json();
        if (!data?.error && data?.trends) setBriefing(data);
      } catch {}
      finally {
        setBriefingLoading(false);
      }
    },
    [briefingLoading],
  );

  useEffect(() => {
    if (!briefRequested.current && articles.length > 0) {
      briefRequested.current = true;
      generateBriefing(articles);
    }
  }, [articles, generateBriefing]);

  // ── Fil dérivé (filtre domaine + enregistrés, tri récent/pertinence) ──
  const feedList = useMemo(() => {
    let arr = articles.filter((a) => domain === "all" || a.category === domain);
    if (flux === "enregistres") arr = arr.filter((a) => saved.has(a.id));
    return [...arr].sort((a, b) =>
      sort === "recent"
        ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        : b.heat - a.heat,
    );
  }, [articles, domain, flux, saved, sort]);

  const openArticle = useMemo(() => {
    if (!openId) return null;
    return [...articles, ...(results ?? [])].find((a) => a.id === openId) ?? null;
  }, [openId, articles, results]);

  const onDomain = useCallback((c: CategoryId) => {
    setResults(null);
    setDomain((prev) => (prev === c ? "all" : c));
    setFlux((f) => (FEED_VIEWS.includes(f) ? f : "fil"));
  }, []);

  const onFlux = useCallback((v: FluxView) => {
    setResults(null);
    setFlux(v);
  }, []);

  const domainLabel = domain !== "all" ? CATEGORY_MAP[domain]?.label : "";
  const domainColor = domain !== "all" ? CATEGORY_MAP[domain]?.color : "#FF5A47";
  const firstName = account?.name.trim().split(/\s+/)[0] ?? "";

  // ── Gate d'authentification ──
  if (!authChecked) return <div className="min-h-screen bg-background" />;
  if (!account) return <AuthScreen />;

  return (
    <>
    <AppShell
      flux={flux}
      onFlux={onFlux}
      domain={domain}
      onDomain={onDomain}
      savedCount={saved.size}
      user={account}
      onLogout={logout}
      onResults={(arts, q) => {
        setResults(arts);
        setQuery(q);
      }}
      onClearSearch={() => setResults(null)}
    >
      {results !== null ? (
        <SearchResults
          results={results}
          query={query}
          savedSet={saved}
          onOpen={setOpenId}
          onSave={toggleSave}
          onBack={() => setResults(null)}
        />
      ) : flux === "brief" ? (
        <BriefView
          briefing={briefing}
          loading={briefingLoading}
          analyzed={articles.length}
          articles={articles}
          onGenerate={() => generateBriefing(articles)}
        />
      ) : flux === "sources" ? (
        <SourcesView />
      ) : (
        <>
          {flux === "fil" && (
            <div className="mb-2 text-[13px] text-foreground/50">Bonjour, {firstName}</div>
          )}

          <div className="mb-[26px] flex flex-wrap items-center gap-3.5">
            <h1 className="text-[25px] font-bold tracking-[-0.015em] text-foreground">
              {TITLES[flux]}
            </h1>
            {domain !== "all" && (
              <button
                onClick={() => setDomain("all")}
                className="inline-flex items-center gap-1.5 rounded-2xl px-[11px] py-[5px] text-[12px] font-semibold"
                style={{ background: `${domainColor}22`, color: domainColor }}
              >
                {domainLabel} <span className="opacity-65">×</span>
              </button>
            )}
            <span className="text-[12.5px] text-foreground/40">{feedList.length} articles</span>

            {/* Tri */}
            <div className="ml-auto flex gap-0.5 rounded-[9px] bg-foreground/5 p-[3px]">
              {(
                [
                  { id: "recent", label: "Récents" },
                  { id: "hot", label: "Pertinence" },
                ] as { id: FeedSort; label: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "rounded-[7px] px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                    sort === s.id
                      ? "bg-card text-foreground shadow-[0_1px_2px_rgba(26,10,8,.1)]"
                      : "text-foreground/50 hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {flux === "fil" && (
            <BriefBanner
              briefing={briefing}
              loading={briefingLoading}
              analyzed={articles.length}
              onOpen={() => setFlux("brief")}
            />
          )}

          {loading ? (
            <FeedSkeleton />
          ) : feedList.length === 0 ? (
            <EmptyState flux={flux} />
          ) : (
            <Feed articles={feedList} savedSet={saved} onOpen={setOpenId} onSave={toggleSave} />
          )}
        </>
      )}
    </AppShell>

    <ArticleDrawer
      article={openArticle}
      saved={openArticle ? saved.has(openArticle.id) : false}
      onClose={() => setOpenId(null)}
      onSave={() => openArticle && toggleSave(openArticle.id)}
    />
    </>
  );
}

function SearchResults({
  results,
  query,
  savedSet,
  onOpen,
  onSave,
  onBack,
}: {
  results: Article[];
  query: string;
  savedSet: Set<string>;
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-foreground">Recherche</h1>
        <span className="text-[13px] text-foreground/50">
          {results.length} résultat{results.length > 1 ? "s" : ""} pour «&nbsp;
          <span className="text-foreground">{query}</span>&nbsp;»
        </span>
        <button
          onClick={onBack}
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-foreground/50 hover:text-foreground"
        >
          <X size={14} /> Fermer
        </button>
      </div>
      {results.length === 0 ? (
        <div className="rounded-[16px] border border-border bg-card p-12 text-center">
          <p className="text-[15px] font-semibold text-foreground/60">Aucun résultat</p>
          <p className="mt-1.5 text-[13px] text-foreground/45">Essaie d'autres termes.</p>
        </div>
      ) : (
        <Feed articles={results} savedSet={savedSet} onOpen={onOpen} onSave={onSave} />
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 border-b border-border px-[18px] py-[15px] last:border-b-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/10" />
          <div className="h-3 flex-1 animate-pulse rounded bg-foreground/10" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ flux }: { flux: FluxView }) {
  const isSaved = flux === "enregistres";
  return (
    <div className="py-[72px] text-center">
      <div className="mx-auto mb-4 h-11 w-11 rounded-xl border-2 border-dashed border-foreground/20" />
      <div className="mb-1.5 text-[15px] font-semibold text-foreground/55">
        {isSaved ? "Aucune fiche enregistrée" : "Rien à afficher"}
      </div>
      <div className="text-[13px] text-foreground/45">
        {isSaved
          ? "Enregistrez un article et il atterrira ici, prêt à ressortir en réunion."
          : "Aucun article pour ce thème à cet instant. Essaie une autre catégorie."}
      </div>
    </div>
  );
}
