"use client";

import { useState, type Ref } from "react";
import type { Article, CategoryId } from "@/lib/types";

type Mode = "semantic" | "keyword";

export function SearchBar({
  category,
  onResults,
  onClear,
  inputRef,
  showKbdHint = false,
}: {
  category: CategoryId;
  onResults: (articles: Article[], query: string, mode: Mode) => void;
  onClear: () => void;
  inputRef?: Ref<HTMLInputElement>;
  showKbdHint?: boolean;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("semantic");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode, category }),
      });
      const data = await res.json();
      if (data?.error === "no_db") {
        setNote("Recherche indisponible : configure Supabase (SUPABASE_URL / KEY).");
        return;
      }
      if (data?.error) {
        setNote("La recherche a échoué. Réessaie.");
        return;
      }
      onResults(data.articles ?? [], query, mode);
    } catch {
      setNote("La recherche a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQ("");
    setNote(null);
    onClear();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <SearchIcon />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={
              mode === "semantic"
                ? "Recherche par sens : « outils no-code pour designers », « levées de fonds IA »…"
                : "Recherche par mot-clé…"
            }
            className="w-full rounded-xl border border-line bg-panel/70 pl-10 pr-24 py-3 text-sm text-ink placeholder:text-faint focus:border-accent/50 outline-none"
          />
          {q ? (
            <button
              onClick={clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-faint hover:text-ink px-2 py-1"
            >
              Effacer
            </button>
          ) : (
            showKbdHint && (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">
                ⌘K
              </kbd>
            )
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-panel/70 p-1">
          {(["semantic", "keyword"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                mode === m ? "bg-accent/20 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {m === "semantic" ? "Sémantique" : "Mot-clé"}
            </button>
          ))}
        </div>

        <button
          onClick={run}
          disabled={loading || !q.trim()}
          className="rounded-xl bg-accent/20 border border-accent/40 px-5 py-3 text-sm font-semibold text-ink hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Recherche…" : "Rechercher"}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-hot">{note}</p>}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
