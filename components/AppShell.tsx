"use client";

import { useState } from "react";
import type { Article, CategoryId, FluxView } from "@/lib/types";
import { Sidebar, type AccountUser } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RightRail } from "./RightRail";

export function AppShell({
  flux,
  onFlux,
  domain,
  onDomain,
  savedCount,
  domainCounts,
  sourcesCount,
  user,
  onLogout,
  onResults,
  onClearSearch,
  children,
}: {
  flux: FluxView;
  onFlux: (v: FluxView) => void;
  domain: CategoryId;
  onDomain: (c: CategoryId) => void;
  savedCount: number;
  domainCounts?: Partial<Record<CategoryId, number>>;
  sourcesCount?: number;
  user: AccountUser;
  onLogout: () => void;
  onResults: (articles: Article[], query: string) => void;
  onClearSearch: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <Sidebar
      flux={flux}
      onFlux={onFlux}
      domain={domain}
      onDomain={onDomain}
      savedCount={savedCount}
      domainCounts={domainCounts}
      sourcesCount={sourcesCount}
      user={user}
      onLogout={onLogout}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  return (
    <div className="h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_340px]">
      {/* Sidebar desktop */}
      <aside className="hidden h-screen lg:block">{sidebar}</aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-64 shadow-2xl">{sidebar}</div>
        </div>
      )}

      {/* Colonne principale */}
      <div className="flex h-screen min-w-0 flex-col">
        <Topbar
          onResults={onResults}
          onClearSearch={onClearSearch}
          onBurger={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 pb-11 pt-7 [scrollbar-gutter:stable] sm:px-9">
          {children}
        </main>
      </div>

      {/* Rail droit "En direct" (xl+) */}
      <aside className="hidden h-screen xl:block">
        <RightRail flux={flux} />
      </aside>
    </div>
  );
}
