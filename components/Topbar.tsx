"use client";

import { useEffect, useRef } from "react";
import { Menu, RefreshCw } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { CATEGORIES, RAMP } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";

type Mode = "semantic" | "keyword";

export function Topbar({
  category,
  onCategory,
  onResults,
  onClear,
  updatedAt,
  loading,
  onRefresh,
  onBurger,
}: {
  category: CategoryId;
  onCategory: (c: CategoryId) => void;
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
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Burger mobile */}
        <button
          onClick={onBurger}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={18} />
        </button>

        {/* Recherche (Entrée pour lancer, ⌘K pour focus) */}
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
          <span className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground md:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-primary" />
            LIVE
            {updatedAt && (
              <span className="text-muted-foreground/70">
                · maj{" "}
                {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </span>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            aria-label="Rafraîchir le flux"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {/* Filtres domaines (liés à la recherche/flux) */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const on = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => onCategory(c.id)}
              aria-pressed={on}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span
                className="h-2 w-2 rounded-full ring-1 ring-black/5"
                style={{ background: c.gradient ? RAMP : c.color }}
              />
              {c.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
