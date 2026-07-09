"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { USER } from "@/config/brand";
import { AppShell } from "@/components/AppShell";
import { type FeedSort } from "@/components/Sidebar";
import { BriefingPanel } from "@/components/BriefingPanel";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";

function applySort(articles: Article[], sort: FeedSort): Article[] {
  if (sort === "recent") {
    return [...articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }
  if (sort === "trending") {
    return [...articles].sort((a, b) => b.heat - a.heat);
  }
  return articles; // "foryou" = classement serveur (fraîcheur × signal)
}

export default function Home() {
  const [category, setCategory] = useState<CategoryId>("all");
  const [sort, setSort] = useState<FeedSort>("foryou");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [results, setResults] = useState<Article[] | null>(null);
  const [resultMeta, setResultMeta] = useState<{ query: string; mode: string } | null>(null);

  const load = useCallback(async (cat: CategoryId) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/feed?category=${cat}`, { cache: "no-store" });
      const data = await res.json();
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setUpdatedAt(new Date());
    } catch {
      setFailed(true);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category);
  }, [category, load]);

  const sorted = useMemo(() => applySort(articles, sort), [articles, sort]);

  const activeLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "Tout";

  return (
    <AppShell
      category={category}
      onCategory={(c) => {
        setResults(null);
        setResultMeta(null);
        setCategory(c);
      }}
      sort={sort}
      onSort={setSort}
      onResults={(arts, query, mode) => {
        setResults(arts);
        setResultMeta({ query, mode });
      }}
      onClear={() => {
        setResults(null);
        setResultMeta(null);
      }}
      updatedAt={updatedAt}
      loading={loading}
      onRefresh={() => load(category)}
    >
      {results !== null ? (
        <SearchResults
          results={results}
          meta={resultMeta}
          onBack={() => {
            setResults(null);
            setResultMeta(null);
          }}
        />
      ) : (
        <>
          {/* Hero — salutation */}
          <div className="mb-8 flex items-center justify-center gap-3 py-4 text-center">
            <Sparkles className="text-primary" size={30} strokeWidth={1.6} />
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              On repart, {USER.firstName}
            </h1>
          </div>

          <div id="briefing" className="scroll-mt-20">
            <BriefingPanel articles={sorted} />
          </div>

          {/* Bandeau contexte flux */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {activeLabel}
              <span className="ml-2 font-mono text-xs font-normal text-muted-foreground/80">
                {sort === "recent" ? "récents" : sort === "trending" ? "tendances" : "pour toi"}
              </span>
            </h2>
            {!loading && !failed && (
              <span className="font-mono text-xs text-muted-foreground/80">{sorted.length} articles</span>
            )}
          </div>

          {loading ? (
            <Masonry>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="mb-4 h-64 break-inside-avoid rounded-2xl" />
              ))}
            </Masonry>
          ) : failed ? (
            <EmptyState
              title="Flux indisponible"
              body="Impossible de joindre les sources pour le moment. Vérifie ta connexion et rafraîchis."
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              title="Rien à afficher"
              body="Aucun article pour ce thème à cet instant. Essaie une autre catégorie."
            />
          ) : (
            <Masonry>
              {sorted.map((a, i) => (
                <ArticleCard key={a.id} a={a} index={i} />
              ))}
            </Masonry>
          )}

          <SourcesSection />
        </>
      )}
    </AppShell>
  );
}

function SearchResults({
  results,
  meta,
  onBack,
}: {
  results: Article[];
  meta: { query: string; mode: string } | null;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="mono-label mr-2 text-primary">
            {meta?.mode === "semantic" ? "Sémantique" : "Mot-clé"}
          </span>
          {results.length} résultat{results.length > 1 ? "s" : ""} pour «{" "}
          <span className="text-foreground">{meta?.query}</span> »
        </p>
        <button onClick={onBack} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          ← Retour au flux
        </button>
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          body="Essaie d'autres termes, ou bascule entre recherche sémantique et mot-clé."
        />
      ) : (
        <Masonry>
          {results.map((a, i) => (
            <ArticleCard key={a.id} a={a} index={i} />
          ))}
        </Masonry>
      )}
    </div>
  );
}

function Masonry({ children }: { children: React.ReactNode }) {
  return <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{children}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SourcesSection() {
  const sources = [
    "Hacker News",
    "Dev.to",
    "TechCrunch",
    "The Verge",
    "VentureBeat",
    "Smashing Magazine",
    "Le Monde",
    "Product Hunt",
  ];
  return (
    <section id="sources" className="mt-12 scroll-mt-20 border-t border-border pt-8">
      <p className="mono-label mb-3">Sources agrégées</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => (
          <span
            key={s}
            className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-muted-foreground/80">
        RSS + API · dédup · résumé & classification IA (Groq) · embeddings locaux (e5-small)
      </p>
    </section>
  );
}
