"use client";

import { useState, type Ref } from "react";
import { Search } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={
              mode === "semantic"
                ? "Recherche par sens : « outils no-code pour designers », « levées de fonds IA »…"
                : "Recherche par mot-clé…"
            }
            className="pl-10 pr-24"
          />
          {q ? (
            <button
              onClick={clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Effacer
            </button>
          ) : (
            showKbdHint && (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
                ⌘K
              </kbd>
            )
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card/70 p-1">
          {(["semantic", "keyword"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                mode === m
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "semantic" ? "Sémantique" : "Mot-clé"}
            </button>
          ))}
        </div>

        <Button onClick={run} disabled={loading || !q.trim()} size="lg" className="shrink-0">
          {loading ? "Recherche…" : "Rechercher"}
        </Button>
      </div>
      {note && <p className="mt-2 text-xs text-destructive">{note}</p>}
    </div>
  );
}
