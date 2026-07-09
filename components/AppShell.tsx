"use client";

import { useState } from "react";
import type { Article, CategoryId, FluxView } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  flux,
  onFlux,
  domain,
  onDomain,
  savedCount,
  onResults,
  onClearSearch,
  updatedAt,
  children,
}: {
  flux: FluxView;
  onFlux: (v: FluxView) => void;
  domain: CategoryId;
  onDomain: (c: CategoryId) => void;
  savedCount: number;
  onResults: (articles: Article[], query: string) => void;
  onClearSearch: () => void;
  updatedAt: Date | null;
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
      onNavigate={() => setMobileOpen(false)}
    />
  );

  return (
    <div className="h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
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
          updatedAt={updatedAt}
          onBurger={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 pb-11 pt-7 sm:px-9">{children}</main>
      </div>
    </div>
  );
}
