"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Bookmark, Check, Share2, Loader2, ArrowUpRight } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo, hostOf } from "@/lib/format";
import { toast } from "@/lib/toast";
import { copyText } from "@/lib/share";
import { cn } from "@/lib/utils";
import { RelevancePill } from "./RelevancePill";

type Mode = "court" | "resume";

function sentences(txt: string): string[] {
  return (txt || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

export function ArticleDrawer({
  article,
  saved,
  related = [],
  onClose,
  onSave,
}: {
  article: Article | null;
  saved: boolean;
  related?: Article[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [mode, setMode] = useState<Mode>("resume");
  const [points, setPoints] = useState<string[]>([]);
  const [pullquote, setPullquote] = useState<string>("");
  const [askOpen, setAskOpen] = useState(false);
  const [askQ, setAskQ] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [askLoading, setAskLoading] = useState(false);

  // Fermeture au clavier + reset à chaque article.
  useEffect(() => {
    if (!article) return;
    setMode("resume");
    setAskOpen(false);
    setAskQ("");
    setAskAnswer("");
    // Points/pullquote : dérivés du résumé/snippet, puis enrichis via Groq si dispo.
    const base = article.summary || article.snippet || "";
    setPoints(sentences(base).slice(0, 3));
    setPullquote(article.whyItMatters || sentences(base)[0] || "");
    let cancelled = false;
    fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: article.title, snippet: article.snippet ?? "", source: article.source }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d) return;
        if (Array.isArray(d.points) && d.points.length) setPoints(d.points.slice(0, 3));
        if (d.pullquote) setPullquote(d.pullquote);
      })
      .catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [article, onClose]);

  const relatedCards = useMemo(
    () =>
      (related || [])
        .filter((r) => article && r.id !== article.id)
        .slice(0, 3),
    [related, article],
  );

  if (!article) return null;
  const a = article;
  const cat: CategoryId = (CATEGORY_MAP[a.category] ? a.category : "tech") as CategoryId;
  const color = categoryColor(cat);
  const label = CATEGORY_MAP[cat]?.label ?? "Tech";
  const host = hostOf(a.url);
  const body = mode === "court" ? a.snippet || a.summary || "" : a.summary || a.snippet || "";

  async function ask(q: string) {
    const query = q.trim();
    if (!query) return;
    setAskQ(query);
    setAskLoading(true);
    setAskAnswer("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          source: a.source,
          snippet: a.snippet ?? "",
          summary: a.summary ?? "",
          question: query,
        }),
      });
      const d = await res.json();
      setAskAnswer(
        d?.answer ||
          `Radar n'a pas pu répondre pour l'instant. Ouvre la source (${a.source}) pour creuser.`,
      );
    } catch {
      setAskAnswer(`Réponse indisponible. Ouvre la source (${a.source}) pour creuser.`);
    } finally {
      setAskLoading(false);
    }
  }

  async function shareArticle() {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav?.share) {
      try {
        await nav.share({ title: a.title, url: a.url });
        return;
      } catch {
        /* annulé → repli copie */
      }
    }
    const ok = await copyText(a.url);
    toast(ok ? "Lien de l'article copié" : "Copie impossible", {
      icon: ok ? "✓" : "!",
      color: ok ? "#4E8D6E" : "#C8663A",
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/32 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[452px] overflow-y-auto bg-background p-[22px_26px_32px] shadow-[-24px_0_48px_-18px_rgba(26,10,8,.35)]">
        {/* Header */}
        <div className="mb-4 flex items-center">
          <div className="flex items-center gap-2">
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
              {label}
            </span>
            <RelevancePill score={a.heat} className="ml-1" />
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto grid h-[30px] w-[30px] place-items-center rounded-full border border-border bg-card text-foreground/55 hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mb-2 text-[11.5px] text-foreground/55">
          <b className="font-semibold text-foreground">{a.source}</b> · {timeAgo(a.publishedAt)}
          {a.points > 0 && <> · {a.points} pts</>}
        </div>
        <h2 className="mb-[18px] text-[21px] font-bold leading-[1.25] tracking-[-0.012em] text-foreground">
          {a.title}
        </h2>

        {/* CTA Voir la source */}
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center gap-3 rounded-[12px] bg-[#1A0A08] p-[14px_18px] text-[#FFF7EA] shadow-[0_8px_20px_-8px_rgba(26,10,8,.35)] transition-transform hover:-translate-y-px"
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-primary text-[#1A0A08]">
            <ArrowUpRight size={17} />
          </span>
          <span className="min-w-0 flex-1 leading-[1.25]">
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
              Lire sur la source
            </span>
            <span className="block truncate text-[13px] font-semibold text-[#FFF7EA]">{host || a.source}</span>
          </span>
          <span className="text-[17px] font-bold text-primary">→</span>
        </a>

        {/* Actions */}
        <div className="mb-[22px] flex gap-2">
          <button
            onClick={onSave}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[9px] p-2.5 text-[12px] font-bold transition-colors",
              saved ? "bg-primary text-white" : "border border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {saved ? <Check size={15} /> : <Bookmark size={15} />}
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
          <button
            onClick={shareArticle}
            className="flex items-center justify-center gap-1.5 rounded-[9px] border border-border bg-card p-[10px_14px] text-[12px] font-semibold text-foreground hover:bg-muted"
          >
            <Share2 size={14} /> Partager
          </button>
        </div>

        {/* Résumé Radar + toggle */}
        <div className="mb-2.5 flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/40">
            Résumé Radar
          </span>
          <div className="ml-auto flex gap-0.5 rounded-[8px] bg-foreground/[0.06] p-[2px]">
            {(
              [
                { id: "court", label: "Court" },
                { id: "resume", label: "Résumé" },
              ] as { id: Mode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "rounded-[6px] px-[11px] py-[5px] font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] transition-colors",
                  mode === m.id ? "bg-foreground text-background" : "text-foreground/55 hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-[18px] text-[14px] leading-[1.65] text-foreground">
          {body || "Pas de résumé disponible — ouvre la source pour le détail."}
        </p>

        {/* 3 points */}
        {points.length > 0 && (
          <>
            <div className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/40">
              {points.length} points à retenir
            </div>
            {points.map((p, i) => (
              <div key={i} className="mb-2.5 flex gap-2.5 text-[13.5px] leading-[1.5] text-foreground/85">
                <span className="font-bold text-primary">→</span>
                <span>{p}</span>
              </div>
            ))}
          </>
        )}

        {/* À ressortir en réunion */}
        {pullquote && (
          <div className="mt-[18px] rounded-[13px] bg-[#1A0A08] p-[18px_20px]">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              À ressortir en réunion
            </div>
            <div className="text-[14.5px] italic leading-[1.45] text-[#FFF7EA]">« {pullquote} »</div>
          </div>
        )}

        {/* Aussi couvert par */}
        {relatedCards.length > 0 && (
          <div className="mt-[22px]">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/40">
                Aussi couvert par
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-primary">
                {relatedCards.length} sources
              </span>
            </div>
            {relatedCards.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-1.5 flex items-center gap-3 rounded-[11px] border border-border bg-card p-[11px_13px] transition-transform hover:translate-x-0.5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="min-w-0 flex-1 leading-[1.25]">
                  <span className="block truncate text-[12.5px] font-semibold text-foreground">{r.source}</span>
                  <span className="block truncate font-mono text-[10.5px] text-foreground/50">
                    {hostOf(r.url)} · {timeAgo(r.publishedAt)}
                  </span>
                </span>
                <span className="text-[14px] font-bold text-primary">→</span>
              </a>
            ))}
          </div>
        )}

        {/* Ask Radar */}
        {!askOpen ? (
          <button
            onClick={() => setAskOpen(true)}
            className="mt-[22px] flex w-full items-center gap-3 rounded-[13px] border border-dashed border-primary/40 bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] p-[14px_18px] text-left text-[13px] font-medium text-foreground transition-colors hover:border-primary"
          >
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary text-[14px] font-bold text-white">
              ?
            </span>
            <span className="flex-1">Poser une question à Radar sur cet article</span>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-primary">Ask IA</span>
          </button>
        ) : (
          <div className="mt-[22px] rounded-[14px] border border-primary/28 bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] p-[18px_20px]">
            <div className="mb-3 flex items-center">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                <span className="h-[6px] w-[6px] animate-pulseDot rounded-full bg-primary" />
                Radar répond · IA
              </div>
              <button onClick={() => setAskOpen(false)} className="ml-auto text-foreground/50 hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            {askLoading && (
              <div className="mb-3 flex items-center gap-2 rounded-[10px] bg-card p-[12px_14px] text-[12.5px] text-foreground/60">
                <Loader2 size={14} className="animate-spin text-primary" /> Radar réfléchit…
              </div>
            )}
            {askAnswer && (
              <div className="mb-3 rounded-[10px] bg-card p-[12px_14px] text-[13px] leading-[1.6] text-foreground">
                {askAnswer}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={askQ}
                onChange={(e) => setAskQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(askQ)}
                placeholder="Ex : Quel impact pour mon équipe ?"
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-[12.5px] text-foreground outline-none"
              />
              <button
                onClick={() => ask(askQ)}
                className="shrink-0 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
              >
                Demander →
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {["Impact pour mon équipe", "Chiffres clés", "Concurrents"].map((c) => (
                <button
                  key={c}
                  onClick={() => ask(c)}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-semibold text-foreground/70 hover:text-foreground"
                >
                  · {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[22px] inline-flex items-center gap-1.5 text-[12px] font-bold text-primary"
        >
          Voir l'article original →
        </a>
      </aside>
    </div>
  );
}
