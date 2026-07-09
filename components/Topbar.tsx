"use client";

import { useEffect, useRef } from "react";
import type { Article, CategoryId } from "@/lib/types";
import { SearchBar } from "./SearchBar";

type Mode = "semantic" | "keyword";

export function Topbar({
  category,
  onResults,
  onClear,
  updatedAt,
  loading,
  onRefresh,
  onBurger,
}: {
  category: CategoryId;
  onResults: (articles: Article[], query: string, mode: Mode) => void;
  onClear: () => void;
  updatedAt: Date | null;
  loading: boolean;
  onRefresh: () => void;
  onBurger: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K + event "radar:focus-search" (déclenché depuis la sidebar)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    function onFocusEvt() {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("radar:focus-search", onFocusEvt as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("radar:focus-search", onFocusEvt as EventListener);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-base/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Burger mobile */}
        <button
          onClick={onBurger}
          className="rounded-lg border border-line bg-panel2/60 p-2 text-muted hover:text-ink lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Recherche (prend toute la largeur) */}
        <div className="min-w-0 flex-1">
          <SearchBar
            category={category}
            onResults={onResults}
            onClear={onClear}
            inputRef={inputRef}
            showKbdHint
          />
        </div>

        {/* LIVE + rafraîchir */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-2 font-mono text-[11px] text-muted md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseDot" />
            LIVE
            {updatedAt && (
              <span className="text-faint">
                · maj{" "}
                {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </span>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2/60 px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent/40 hover:text-ink"
            aria-label="Rafraîchir le flux"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={loading ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
