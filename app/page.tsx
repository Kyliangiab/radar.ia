"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Article, Briefing, CategoryId, Density, FluxView } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { Feed } from "@/components/Feed";
import { BriefBanner } from "@/components/BriefBanner";
import { ArticleDrawer } from "@/components/ArticleDrawer";
import { AuthScreen, type AuthUser } from "@/components/AuthScreen";
import { BriefView } from "@/components/views/BriefView";
import { TendancesView } from "@/components/views/TendancesView";
import { SourcesView } from "@/components/views/SourcesView";

const FEED_VIEWS: FluxView[] = ["pourtoi", "recents", "enregistres"];
const TITLES: Record<string, string> = {
  pourtoi: "Pour toi",
  recents: "Les plus récents",
  enregistres: "Mes fiches",
};

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [flux, setFlux] = useState<FluxView>("pourtoi");
  const [domain, setDomain] = useState<CategoryId>("all");
  const [density, setDensity] = useState<Density>("confort");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const [results, setResults] = useState<Article[] | null>(null);
  const [query, setQuery] = useState("");

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const briefRequested = useRef(false);

  // ── Chargement du flux ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feed?category=all", { cache: "no-store" });
      const data = await res.json();
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setUpdatedAt(new Date());
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // ── Auth (démo, persistée) ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("radar:user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setAuthChecked(true);
  }, []);
  const handleAuth = useCallback((u: AuthUser) => {
    setUser(u);
    try {
      localStorage.setItem("radar:user", JSON.stringify(u));
    } catch {}
  }, []);
  const logout = useCallback(() => {
    setUser(null);
    setArticles([]);
    setBriefing(null);
    briefRequested.current = false;
    try {
      localStorage.removeItem("radar:user");
    } catch {}
  }, []);

  // ── Enregistrés (persistés) ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("radar:saved");
      if (raw) setSaved(new Set(JSON.parse(raw)));
    } catch {}
  }, []);
  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("radar:saved", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  // ── Briefing (auto-généré une fois) ──
  const generateBriefing = useCallback(async (list: Article[]) => {
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
  }, [briefingLoading]);

  useEffect(() => {
    if (!briefRequested.current && articles.length > 0) {
      briefRequested.current = true;
      generateBriefing(articles);
    }
  }, [articles, generateBriefing]);

  // ── Feed dérivé ──
  const feedList = useMemo(() => {
    let arr = articles.filter((a) => domain === "all" || a.category === domain);
    if (flux === "recents") {
      arr = [...arr].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } else if (flux === "enregistres") {
      arr = arr.filter((a) => saved.has(a.id));
    }
    return arr;
  }, [articles, domain, flux, saved]);

  const openArticle = useMemo(() => {
    if (!openId) return null;
    return [...articles, ...(results ?? [])].find((a) => a.id === openId) ?? null;
  }, [openId, articles, results]);

  const onDomain = useCallback((c: CategoryId) => {
    setResults(null);
    setDomain((prev) => (prev === c ? "all" : c));
    setFlux((f) => (FEED_VIEWS.includes(f) ? f : "pourtoi"));
  }, []);

  const onFlux = useCallback((v: FluxView) => {
    setResults(null);
    setFlux(v);
  }, []);

  const domainLabel = domain !== "all" ? CATEGORY_MAP[domain]?.label : "";
  const domainColor = domain !== "all" ? CATEGORY_MAP[domain]?.color : "#FF6B6A";
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  // ── Gate d'authentification ──
  if (!authChecked) return <div className="min-h-screen bg-background" />;
  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <>
      <AppShell
        flux={flux}
        onFlux={onFlux}
        domain={domain}
        onDomain={onDomain}
        savedCount={saved.size}
        user={user}
        onLogout={logout}
        onResults={(arts, q) => {
          setResults(arts);
          setQuery(q);
        }}
        onClearSearch={() => setResults(null)}
        updatedAt={updatedAt}
      >
        {results !== null ? (
          <SearchResults
            results={results}
            query={query}
            density={density}
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
        ) : flux === "tendances" ? (
          <TendancesView articles={articles} briefing={briefing} analyzed={articles.length} />
        ) : flux === "sources" ? (
          <SourcesView />
        ) : (
          <>
            {flux === "pourtoi" && (
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

              <div className="ml-auto flex gap-0.5 rounded-[9px] bg-foreground/5 p-[3px]">
                {(["confort", "compact"] as Density[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={cn(
                      "rounded-[7px] px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                      density === d
                        ? "bg-card text-foreground shadow-[0_1px_2px_rgba(38,0,0,.1)]"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                  >
                    {d === "confort" ? "Confort" : "Compact"}
                  </button>
                ))}
              </div>
            </div>

            {flux === "pourtoi" && (
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
              <Feed
                articles={feedList}
                density={density}
                savedSet={saved}
                onOpen={setOpenId}
                onSave={toggleSave}
              />
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
  density,
  savedSet,
  onOpen,
  onSave,
  onBack,
}: {
  results: Article[];
  query: string;
  density: Density;
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
        <Feed articles={results} density={density} savedSet={savedSet} onOpen={onOpen} onSave={onSave} />
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[320px] animate-pulse rounded-[18px] border border-border bg-card" />
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
