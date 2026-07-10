"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { ScanOverlay } from "@/components/ScanOverlay";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type GlobalSource = { id: string; name: string; type: string; category: string };
type UserSource = { id: string; name: string; url: string };

type Row = {
  id: string;
  name: string;
  type: string;
  color: string;
  kind: "global" | "user";
};

const FREQS = ["Temps réel", "Toutes les heures", "2× / jour", "Quotidien"];

// "rss" + "tech" → "RSS · Tech" (comme le design).
function prettyType(type: string, category: string) {
  const cat = CATEGORY_MAP[category as CategoryId]?.label ?? category;
  const kind =
    type === "rss" ? "RSS" : type === "producthunt" ? "Product Hunt" : type === "devto" ? "API" : type.toUpperCase();
  return `${kind} · ${cat}`;
}

export function SourcesView({ articles = [] }: { articles?: Article[] }) {
  const [globals, setGlobals] = useState<GlobalSource[]>([]);
  const [mine, setMine] = useState<UserSource[]>([]);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [freq, setFreq] = useState("Toutes les heures");
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [paused, setPaused] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  async function loadMine() {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { data } = await sb
      .from("user_sources")
      .select("id,name,url")
      .order("created_at", { ascending: false });
    setMine((data ?? []) as UserSource[]);
  }

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setGlobals(d.sources ?? []))
      .catch(() => {});
    loadMine();
  }, []);

  async function add() {
    const u = url.trim();
    if (!u) return;
    setError(null);
    setNote(null);
    const sb = getSupabaseBrowser();
    const token = (await sb?.auth.getSession())?.data.session?.access_token;
    if (!token) {
      setError("Session expirée — reconnecte-toi.");
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: u }),
      });
      const d = await res.json();
      if (d.error === "invalid_feed" || d.error === "invalid_url") {
        setError("Ce lien n'est pas un flux RSS valide.");
      } else if (d.error) {
        setError("Ajout impossible. Réessaie.");
      } else {
        setUrl("");
        setNote(`« ${d.name} » ajoutée — ${d.count} article${d.count > 1 ? "s" : ""} collecté${d.count > 1 ? "s" : ""}.`);
        toast(`Source ajoutée · ${d.name}`, { icon: "+", color: "#4E8D6E" });
        await loadMine();
      }
    } catch {
      setError("Ajout impossible. Réessaie.");
    } finally {
      setScanning(false);
    }
  }

  async function removeUser(id: string) {
    const sb = getSupabaseBrowser();
    await sb?.from("user_sources").delete().eq("id", id);
    toast("Source retirée", { icon: "✕", color: "#C8663A" });
    loadMine();
  }

  // Volume réel par source (nombre d'articles du flux venant de cette source).
  const countBySource = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of articles) m[a.source] = (m[a.source] ?? 0) + 1;
    return m;
  }, [articles]);

  const rows: Row[] = useMemo(() => {
    const g: Row[] = globals.map((s) => ({
      id: s.id,
      name: s.name,
      type: prettyType(s.type, s.category),
      color: categoryColor(s.category as CategoryId),
      kind: "global",
    }));
    const u: Row[] = mine.map((s) => ({
      id: s.id,
      name: s.name,
      type: "Flux RSS · perso",
      color: "#FF5A47",
      kind: "user",
    }));
    return [...g, ...u].filter((r) => !hidden.has(r.id));
  }, [globals, mine, hidden]);

  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "paused" ? paused.has(r.id) : !paused.has(r.id),
  );

  function togglePause(id: string) {
    const willPause = !paused.has(id);
    setPaused((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    toast(willPause ? "Source mise en pause" : "Source réactivée", {
      icon: willPause ? "⏸" : "▶",
      color: willPause ? "#C8663A" : "#4E8D6E",
    });
  }

  function remove(s: Row) {
    if (s.kind === "user") removeUser(s.id);
    else {
      setHidden((p) => new Set(p).add(s.id));
      toast("Source retirée", { icon: "✕", color: "#C8663A" });
    }
  }

  function pickFreq(f: string) {
    setFreq(f);
    toast(`Fréquence · ${f}`, { icon: "⏱", color: "#4E8D6E" });
  }

  return (
    <div>
      {scanning && <ScanOverlay />}

      <h1 className="mb-1 text-[26px] font-bold tracking-[-0.015em] text-foreground">Sources</h1>
      <p className="mb-6 max-w-[560px] text-[13px] leading-[1.5] text-foreground/55">
        Radar écoute ces sources en continu, dédoublonne, résume avec l'IA — tu décides quelles voix
        comptent.
      </p>

      {/* Fréquence de collecte */}
      <div className="mb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/40">
        Fréquence de collecte · {freq}
      </div>
      <div className="mb-7 flex flex-wrap gap-2">
        {FREQS.map((f) => (
          <button
            key={f}
            onClick={() => pickFreq(f)}
            className={cn(
              "rounded-full border px-[15px] py-[9px] text-[12.5px] font-medium transition-colors",
              freq === f
                ? "border-transparent bg-[#1A0A08] text-[#FFF7EA]"
                : "border-border bg-card text-foreground/60 hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Ajouter une source */}
      <div className="mb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/40">
        Ajouter une source
      </div>
      <div className="mb-2 flex gap-2.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="https://…"
          className="min-w-0 flex-1 rounded-full border border-border bg-card px-[18px] py-[11px] text-[13px] text-foreground outline-none placeholder:text-foreground/40"
        />
        <button
          onClick={add}
          disabled={scanning || !url.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[12.5px] font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : null}
          Ajouter →
        </button>
      </div>
      {error && <p className="mb-2 text-[12px] text-destructive">{error}</p>}
      {note && <p className="mb-2 text-[12px] text-[#4E8D6E]">{note}</p>}

      {/* Sources surveillées */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/40">
          Sources surveillées · {rows.length}
        </div>
        <div className="flex gap-0.5 rounded-full bg-foreground/[0.06] p-[3px]">
          {(
            [
              { id: "all", label: "Toutes" },
              { id: "active", label: "Actives" },
              { id: "paused", label: "Pause" },
            ] as { id: typeof filter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-[5px] text-[10.5px] font-semibold transition-colors",
                filter === f.id
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(26,10,8,.08)]"
                  : "text-foreground/50 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-foreground/45">
          Aucune source dans ce filtre.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {shown.map((s) => {
            const isPaused = paused.has(s.id);
            const count = countBySource[s.name] ?? 0;
            const health = isPaused ? "paused" : count > 0 ? "ok" : "slow";
            const healthMeta =
              health === "ok"
                ? { label: "OK", color: "#4E8D6E", bg: "rgba(78,141,110,.14)" }
                : health === "slow"
                  ? { label: "Lent", color: "#C8663A", bg: "rgba(200,102,58,.16)" }
                  : { label: "En pause", color: "rgba(26,10,8,.5)", bg: "rgba(26,10,8,.07)" };
            return (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-[13px] border border-border bg-card p-[15px_17px]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: s.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold leading-[1.2] text-foreground">
                      {s.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] text-foreground/50">{s.type}</div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.04em]"
                    style={{ background: healthMeta.bg, color: healthMeta.color }}
                  >
                    {healthMeta.label}
                  </span>
                </div>

                <div className="font-mono text-[10.5px] tracking-[0.02em] text-foreground/55">
                  {count} art. · dans le fil
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => togglePause(s.id)}
                    className={cn(
                      "flex-1 rounded-2xl border py-[6px] text-[11.5px] font-semibold transition-colors",
                      isPaused
                        ? "border-border bg-transparent text-foreground/55 hover:text-foreground"
                        : "border-[#4E8D6E]/45 bg-[#4E8D6E]/10 text-[#4E8D6E]",
                    )}
                  >
                    {isPaused ? "En pause" : "Actif"}
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="rounded-2xl border border-border bg-transparent px-3 py-[6px] text-[11.5px] font-medium text-foreground/55 transition-colors hover:border-[#C8663A] hover:text-[#C8663A]"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
