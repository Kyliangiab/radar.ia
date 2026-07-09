"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Rss } from "lucide-react";
import { categoryColor } from "@/lib/categories";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { ScanOverlay } from "@/components/ScanOverlay";
import { cn } from "@/lib/utils";

type GlobalSource = { id: string; name: string; type: string; category: string };
type UserSource = { id: string; name: string; url: string };

export function SourcesView() {
  const [globals, setGlobals] = useState<GlobalSource[]>([]);
  const [mine, setMine] = useState<UserSource[]>([]);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
        await loadMine();
      }
    } catch {
      setError("Ajout impossible. Réessaie.");
    } finally {
      setScanning(false);
    }
  }

  async function remove(id: string) {
    const sb = getSupabaseBrowser();
    await sb?.from("user_sources").delete().eq("id", id);
    loadMine();
  }

  return (
    <div className="max-w-[800px]">
      {scanning && <ScanOverlay />}

      <div className="mb-1 text-[22px] font-bold text-foreground">Sources &amp; configuration</div>
      <div className="mb-7 text-[13px] text-foreground/55">
        Radar interroge ces sources en continu, dédoublonne et classe automatiquement.
      </div>

      {/* Sources globales */}
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
        Sources surveillées ({globals.length})
      </div>
      <div className="mb-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {globals.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-[14px_16px]"
          >
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ background: categoryColor(s.category as any) }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-foreground">{s.name}</div>
              <div className="truncate text-[11.5px] uppercase tracking-wide text-foreground/40">{s.type}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mes sources RSS */}
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
        Mes flux RSS
      </div>
      <div className="mb-2.5 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
          <Rss size={15} className="shrink-0 text-foreground/40" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Colle l'URL d'un flux RSS (le nom est récupéré tout seul)"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/40"
          />
        </div>
        <button
          onClick={add}
          disabled={scanning || !url.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {scanning ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Ajouter
        </button>
      </div>
      {error && <p className="mb-2 text-[12px] text-destructive">{error}</p>}
      {note && <p className="mb-2 text-[12px] text-[#4E8D6E]">{note}</p>}

      {mine.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-foreground/45">
          Aucun flux perso pour l'instant. Ajoute-en un pour l'inclure dans ton fil.
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {mine.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-[14px_16px]"
            >
              <Rss size={15} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-foreground">{s.name}</div>
                <div className="truncate text-[11.5px] text-foreground/40">{s.url}</div>
              </div>
              <button
                onClick={() => remove(s.id)}
                aria-label="Retirer"
                className="shrink-0 text-foreground/40 transition-colors hover:text-destructive"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
