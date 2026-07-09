"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Menu, Loader2 } from "lucide-react";
import type { Article } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({
  onResults,
  onClearSearch,
  onBurger,
}: {
  onResults: (articles: Article[], query: string) => void;
  onClearSearch: () => void;
  onBurger: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    const onFocusEvt = () => inputRef.current?.focus();
    window.addEventListener("keydown", onKey);
    window.addEventListener("radar:focus-search", onFocusEvt as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("radar:focus-search", onFocusEvt as EventListener);
    };
  }, []);

  async function run() {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: "semantic", category: "all" }),
      });
      const data = await res.json();
      if (data?.error === "no_db") {
        setNote("Configure Supabase pour activer la recherche.");
        return;
      }
      if (data?.error) {
        setNote("La recherche a échoué. Réessaie.");
        return;
      }
      onResults(data.articles ?? [], query);
    } catch {
      setNote("La recherche a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQ("");
    setNote(null);
    onClearSearch();
  }

  return (
    <header className="sticky top-0 z-20 flex-none border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 py-[13px] sm:px-6">
        <button
          onClick={onBurger}
          className="grid h-9 w-9 place-items-center rounded-lg text-foreground/50 hover:text-foreground lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={18} />
        </button>

        {/* Recherche unique */}
        <div className="flex w-full max-w-[520px] items-center gap-[10px] rounded-xl border border-border bg-card px-[14px] py-[11px]">
          {loading ? (
            <Loader2 size={15} className="shrink-0 animate-spin text-primary" />
          ) : (
            <Search size={15} className="shrink-0 text-foreground/40" />
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
              if (e.key === "Escape") clear();
            }}
            placeholder="Rechercher un sujet, une techno, une source…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/40"
          />
          {q ? (
            <button
              onClick={clear}
              className="shrink-0 text-[11px] font-semibold text-foreground/40 hover:text-foreground"
            >
              Effacer
            </button>
          ) : (
            <kbd className="shrink-0 rounded-[5px] border border-border px-[5px] py-0.5 font-mono text-[10px] font-semibold text-foreground/35">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Thème */}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
      {note && (
        <p className="px-4 pb-2 text-[11px] text-[#E0503F] sm:px-6">{note}</p>
      )}
    </header>
  );
}
