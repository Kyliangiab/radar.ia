"use client";

import { useState } from "react";
import type { Article, CategoryId } from "@/lib/types";
import { Sidebar, type FeedSort } from "./Sidebar";
import { Topbar } from "./Topbar";

type Mode = "semantic" | "keyword";

export function AppShell({
  category,
  onCategory,
  sort,
  onSort,
  onResults,
  onClear,
  updatedAt,
  loading,
  onRefresh,
  children,
}: {
  category: CategoryId;
  onCategory: (c: CategoryId) => void;
  sort: FeedSort;
  onSort: (s: FeedSort) => void;
  onResults: (articles: Article[], query: string, mode: Mode) => void;
  onClear: () => void;
  updatedAt: Date | null;
  loading: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* ── Sidebar desktop (fixe) ── */}
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-panel/40 lg:block">
        <Sidebar category={category} onCategory={onCategory} sort={sort} onSort={onSort} />
      </aside>

      {/* ── Sidebar mobile (drawer) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-line bg-base shadow-2xl">
            <Sidebar
              category={category}
              onCategory={onCategory}
              sort={sort}
              onSort={onSort}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Colonne principale ── */}
      <div className="min-w-0">
        <Topbar
          category={category}
          onResults={onResults}
          onClear={onClear}
          updatedAt={updatedAt}
          loading={loading}
          onRefresh={onRefresh}
          onBurger={() => setMobileOpen(true)}
        />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
