"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Menu, Loader2, Bell } from "lucide-react";
import type { Article } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

const NOTIFS = [
  { icon: "✦", title: "Ton brief du jour est prêt", sub: "3 signaux à retenir", when: "il y a 4 h", color: "#FF5A47" },
  { icon: "↑", title: "Sujet en accélération", sub: "« Agents autonomes » · +142 % cette semaine", when: "il y a 2 h", color: "#4E8D6E" },
  { icon: "⧉", title: "The Batch a publié 3 articles", sub: "Data / IA · à revoir dans ton fil", when: "il y a 1 h", color: "#8E5FB8" },
  { icon: "⏳", title: "2 sources en attente", sub: "Retry auto dans 3 min", when: "il y a 30 min", color: "rgba(26,10,8,.55)" },
];

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
  const [now, setNow] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

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

        {/* Thème · Synchro · Notifications */}
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />

          <div className="hidden items-center gap-2 rounded-full bg-[#4E8D6E]/14 px-3 py-[7px] md:flex">
            <span className="h-[7px] w-[7px] animate-pulseDot rounded-full bg-[#4E8D6E]" />
            <span className="whitespace-nowrap text-[11.5px] font-semibold text-[#2F6549] dark:text-[#5FAE8A]">
              Synchro{now && ` · ${now}`}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-border bg-card text-foreground/70 transition-colors hover:text-foreground"
            >
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-[6px] w-[6px] rounded-full bg-primary" />
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-11 z-40 w-[330px] rounded-[14px] border border-border bg-popover p-2 shadow-[0_24px_48px_-14px_rgba(26,10,8,.3)]">
                  <div className="flex items-center px-3 py-2">
                    <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground/55">
                      Notifications
                    </span>
                    <span className="ml-auto font-mono text-[10px] font-semibold text-primary">
                      04 nouveaux
                    </span>
                  </div>
                  {NOTIFS.map((n, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-foreground/[0.04]"
                    >
                      <span
                        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[12px] font-bold"
                        style={{ background: `${n.color}22`, color: n.color }}
                      >
                        {n.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold leading-[1.3] text-foreground">
                          {n.title}
                        </div>
                        <div className="text-[11px] leading-[1.35] text-foreground/55">{n.sub}</div>
                      </div>
                      <span className="whitespace-nowrap pt-0.5 font-mono text-[9.5px] text-foreground/40">
                        {n.when}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-2 border-t border-border px-3 pb-1 pt-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-foreground/40">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#4E8D6E]" />
                    Notifié 5 min avant chaque brief
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {note && (
        <p className="px-4 pb-2 text-[11px] text-[#E0503F] sm:px-6">{note}</p>
      )}
    </header>
  );
}
