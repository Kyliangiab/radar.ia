"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { listSourcePrefs, setSourcePref, purgeArchivedSource } from "@/lib/sourcePrefs";
import { ScanOverlay } from "@/components/ScanOverlay";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type GlobalSource = { id: string; name: string; type: string; category: string };
type UserSource = { id: string; name: string; url: string };

type PrefRow = { paused: boolean; removed: boolean; removedAt: string | null };

type Row = {
  id: string;
  name: string;
  type: string;
  color: string;
  kind: "global" | "user";
};

const ARCHIVE_MS = 72 * 3600 * 1000; // fenêtre de restauration : 72 h

// "rss" + "tech" → "RSS · Tech" (comme le design).
function prettyType(type: string, category: string) {
  const cat = CATEGORY_MAP[category as CategoryId]?.label ?? category;
  const kind =
    type === "rss" ? "RSS" : type === "producthunt" ? "Product Hunt" : type === "devto" ? "API" : type.toUpperCase();
  return `${kind} · ${cat}`;
}

export function SourcesView({
  articles = [],
  onSourceAdded,
}: {
  articles?: Article[];
  onSourceAdded?: () => void;
}) {
  const [globals, setGlobals] = useState<GlobalSource[]>([]);
  const [mine, setMine] = useState<UserSource[]>([]);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "active" | "paused" | "archived">("all");
  const [prefsMap, setPrefsMap] = useState<Record<string, PrefRow>>({});
  const [uid, setUid] = useState<string | null>(null);

  const isPaused = (id: string) => !!prefsMap[id]?.paused;
  const isRemoved = (id: string) => !!prefsMap[id]?.removed;

  // Sources perso + préférences ; purge les archives perso de plus de 72 h.
  async function loadUserData() {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const uidVal = (await sb.auth.getUser()).data.user?.id ?? null;
    setUid(uidVal);
    const [mineRes, prefs] = await Promise.all([
      sb.from("user_sources").select("id,name,url").order("created_at", { ascending: false }),
      listSourcePrefs(),
    ]);
    const mineRows = (mineRes.data ?? []) as UserSource[];
    const mineIds = new Set(mineRows.map((m) => m.id));

    // Purge définitive : sources PERSO archivées depuis > 72 h → suppression DB.
    const cutoff = Date.now() - ARCHIVE_MS;
    const expired = prefs.filter(
      (p) =>
        p.removed &&
        p.updated_at &&
        new Date(p.updated_at).getTime() < cutoff &&
        mineIds.has(p.source_id),
    );
    if (expired.length && uidVal) {
      await Promise.all(expired.map((p) => purgeArchivedSource(uidVal, p.source_id)));
      return loadUserData(); // recharge propre après purge
    }

    setMine(mineRows);
    const map: Record<string, PrefRow> = {};
    for (const p of prefs) map[p.source_id] = { paused: p.paused, removed: p.removed, removedAt: p.updated_at };
    setPrefsMap(map);
  }

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setGlobals(d.sources ?? []))
      .catch(() => {});
    loadUserData();
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
        // Deux chiffres honnêtes (T10) : trouvés (collectés) vs ajoutés au fil
        // (enrichis `ok`). Le cap T8 + les doublons expliquent l'écart.
        const found = d.count ?? 0;
        const added = d.ok ?? 0;
        const s = (n: number) => (n > 1 ? "s" : "");
        setNote(`« ${d.name} » ajoutée — ${found} trouvé${s(found)}, ${added} ajouté${s(added)} au fil.`);
        toast(
          found > 0
            ? `Source ajoutée · ${found} article${s(found)} trouvé${s(found)}, ${added} ajouté${s(added)} au fil`
            : `Source ajoutée · ${d.name} (aucun article récent)`,
          { icon: "+", color: "#4E8D6E" },
        );
        await loadUserData();
        onSourceAdded?.(); // rafraîchit le fil principal (nouveaux articles)
      }
    } catch {
      setError("Ajout impossible. Réessaie.");
    } finally {
      setScanning(false);
    }
  }

  // Volume réel par source (nombre d'articles du flux venant de cette source).
  const countBySource = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of articles) m[a.source] = (m[a.source] ?? 0) + 1;
    return m;
  }, [articles]);

  const allRows: Row[] = useMemo(() => {
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
    return [...g, ...u];
  }, [globals, mine]);

  // Sources visibles (non archivées).
  const rows = useMemo(() => allRows.filter((r) => !isRemoved(r.id)), [allRows, prefsMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Archivées et encore restaurables (< 72 h).
  const archivedRows = useMemo(() => {
    const cutoff = Date.now() - ARCHIVE_MS;
    return allRows
      .filter((r) => {
        const p = prefsMap[r.id];
        return !!p?.removed && !!p.removedAt && new Date(p.removedAt).getTime() > cutoff;
      })
      .map((r) => ({ ...r, removedAt: prefsMap[r.id]!.removedAt as string }));
  }, [allRows, prefsMap]);

  const shown = rows.filter((r) =>
    filter === "active" ? !isPaused(r.id) : filter === "paused" ? isPaused(r.id) : true,
  );

  function togglePause(id: string) {
    const willPause = !isPaused(id);
    setPrefsMap((m) => ({
      ...m,
      [id]: { paused: willPause, removed: m[id]?.removed ?? false, removedAt: m[id]?.removedAt ?? null },
    }));
    if (uid) setSourcePref(uid, id, { paused: willPause });
    toast(willPause ? "Source mise en pause" : "Source réactivée", {
      icon: willPause ? "⏸" : "▶",
      color: willPause ? "#C8663A" : "#4E8D6E",
    });
  }

  // Retirer = archiver (restaurable 72 h, PAS de suppression immédiate).
  function remove(s: Row) {
    const nowIso = new Date().toISOString();
    setPrefsMap((m) => ({
      ...m,
      [s.id]: { paused: m[s.id]?.paused ?? false, removed: true, removedAt: nowIso },
    }));
    if (uid) setSourcePref(uid, s.id, { removed: true });
    toast("Source archivée · restaurable 72 h", { icon: "🗄", color: "#C8663A" });
  }

  function restore(id: string) {
    setPrefsMap((m) => ({
      ...m,
      [id]: { paused: m[id]?.paused ?? false, removed: false, removedAt: null },
    }));
    if (uid) setSourcePref(uid, id, { removed: false });
    toast("Source restaurée", { icon: "↩", color: "#4E8D6E" });
  }

  return (
    <div>
      {scanning && <ScanOverlay />}

      <h1 className="mb-1 text-[26px] font-bold tracking-[-0.015em] text-foreground">Sources</h1>
      <p className="mb-6 max-w-[560px] text-[13px] leading-[1.5] text-foreground/55">
        Radar écoute ces sources en continu, dédoublonne, résume avec l'IA — tu décides quelles voix
        comptent.
      </p>

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
      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/40">
          {filter === "archived" ? `Archivées · ${archivedRows.length}` : `Sources surveillées · ${rows.length}`}
        </div>
        <div className="flex gap-0.5 rounded-full bg-foreground/[0.06] p-[3px]">
          {(
            [
              { id: "all", label: "Toutes" },
              { id: "active", label: "Actives" },
              { id: "paused", label: "Pause" },
              { id: "archived", label: "Archivées" },
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
              {f.id === "archived" && archivedRows.length > 0 && (
                <span className="ml-1 font-mono text-[9px] text-primary">{archivedRows.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filter === "archived" ? (
        archivedRows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-foreground/45">
            Aucune source archivée. « Retirer » place une source ici — restaurable 72 h.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {archivedRows.map((s) => {
              const hoursLeft = Math.max(
                0,
                Math.ceil((new Date(s.removedAt).getTime() + ARCHIVE_MS - Date.now()) / 3600000),
              );
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-[13px] border border-dashed border-border bg-card p-[15px_17px]"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-[9px] w-[9px] shrink-0 rounded-full opacity-50"
                      style={{ background: s.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold leading-[1.2] text-foreground/70">
                        {s.name}
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] text-foreground/45">{s.type}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#C8663A]/[0.14] px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#C8663A]">
                      Archivée
                    </span>
                  </div>

                  <div className="font-mono text-[10.5px] tracking-[0.02em] text-foreground/55">
                    Restaurable encore {hoursLeft} h{s.kind === "user" ? " · puis supprimée" : ""}
                  </div>

                  <button
                    onClick={() => restore(s.id)}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#4E8D6E]/45 bg-[#4E8D6E]/10 py-[6px] text-[11.5px] font-semibold text-[#4E8D6E] transition-colors hover:bg-[#4E8D6E]/20"
                  >
                    <RotateCcw size={13} /> Restaurer
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-foreground/45">
          Aucune source dans ce filtre.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {shown.map((s) => {
            const paused = isPaused(s.id);
            // Le compte vient du feed CHARGÉ : tant qu'il ne l'est pas, on ne
            // prétend pas « 0 » ni un statut santé (T10 — honnêteté du compteur).
            const feedLoaded = articles.length > 0;
            const count = countBySource[s.name] ?? 0;
            const health = paused ? "paused" : !feedLoaded ? "unknown" : count > 0 ? "ok" : "slow";
            const healthMeta =
              health === "ok"
                ? { label: "OK", color: "#4E8D6E", bg: "rgba(78,141,110,.14)" }
                : health === "slow"
                  ? { label: "Lent", color: "#C8663A", bg: "rgba(200,102,58,.16)" }
                  : health === "unknown"
                    ? { label: "—", color: "rgba(26,10,8,.5)", bg: "rgba(26,10,8,.07)" }
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
                  {feedLoaded ? `${count} art.` : "—"} · dans le fil
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => togglePause(s.id)}
                    className={cn(
                      "flex-1 rounded-2xl border py-[6px] text-[11.5px] font-semibold transition-colors",
                      paused
                        ? "border-border bg-transparent text-foreground/55 hover:text-foreground"
                        : "border-[#4E8D6E]/45 bg-[#4E8D6E]/10 text-[#4E8D6E]",
                    )}
                  >
                    {paused ? "En pause" : "Actif"}
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
