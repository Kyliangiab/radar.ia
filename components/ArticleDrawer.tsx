"use client";

import { useEffect, useState } from "react";
import { X, Bookmark, Check, Loader2 } from "lucide-react";
import type { Article, CategoryId, Summary } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { RelevancePill } from "./RelevancePill";

export function ArticleDrawer({
  article,
  saved,
  onClose,
  onSave,
}: {
  article: Article | null;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [sum, setSum] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);

  useEffect(() => {
    if (!article) return;
    // seed avec le résumé stocké s'il existe
    setSum(article.summary ? { summary: article.summary, whyItMatters: article.whyItMatters ?? "" } : null);
    setNoKey(false);
    let cancelled = false;
    setLoading(true);
    fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: article.title, snippet: article.snippet ?? "", source: article.source }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.error === "no_key") return setNoKey(true);
        if (data?.summary) setSum(data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [article]);

  // Fermeture au clavier
  useEffect(() => {
    if (!article) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [article, onClose]);

  if (!article) return null;
  const cat: CategoryId = (CATEGORY_MAP[article.category] ? article.category : "tech") as CategoryId;
  const color = categoryColor(cat);
  const label = CATEGORY_MAP[cat]?.label ?? "Tech";
  const points = sum?.points ?? [];
  const pullquote = sum?.pullquote || sum?.whyItMatters || "";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-hidden="true" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[452px] overflow-y-auto bg-background p-[26px_30px_34px] shadow-[-14px_0_40px_-12px_rgba(38,0,0,.35)]">
        <div className="mb-[18px] flex items-center">
          <div className="flex items-center gap-2">
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.04em]"
              style={{ color }}
            >
              {label}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto grid h-[30px] w-[30px] place-items-center rounded-full border border-border bg-card text-foreground/50 transition-colors hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mb-1.5 text-[12px] text-foreground/40">
          {article.source} · {timeAgo(article.publishedAt)}
        </div>
        <h2 className="mb-3.5 text-[21px] font-bold leading-[1.25] text-foreground">
          {article.title}
        </h2>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="text-[11px] text-foreground/45">Pertinence</span>
          <RelevancePill score={article.heat} />
        </div>

        <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-foreground/40">
          Résumé généré par Radar
        </div>

        {noKey ? (
          <p className="text-[13.5px] text-foreground/60">
            Ajoute <code className="font-mono text-foreground">GROQ_API_KEY</code> pour générer un
            résumé. En attendant :{" "}
            {article.snippet || "aucun extrait disponible pour cet article."}
          </p>
        ) : sum ? (
          <>
            <p className="mb-[18px] text-[14px] leading-[1.65] text-foreground">{sum.summary}</p>
            {points.map((p, i) => (
              <div
                key={i}
                className="mb-[9px] flex gap-[9px] text-[13.5px] leading-[1.45] text-foreground/80"
              >
                <span className="font-bold text-primary">→</span>
                <span>{p}</span>
              </div>
            ))}
            {loading && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-foreground/45">
                <Loader2 size={13} className="animate-spin text-primary" /> Analyse approfondie…
              </div>
            )}
            {pullquote && (
              <div className="mt-[18px] rounded-[13px] bg-foreground p-[16px_18px]">
                <div className="mb-[7px] font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-primary">
                  À ressortir en réunion
                </div>
                <div className="text-[14.5px] italic leading-[1.45] text-background">
                  « {pullquote} »
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-foreground/50">
            <Loader2 size={14} className="animate-spin text-primary" /> L'IA rédige le résumé…
          </div>
        )}

        <button
          onClick={onSave}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] p-3 text-[13px] font-bold transition-colors"
          style={
            saved
              ? { background: "#FF6B6A", color: "#fff" }
              : { background: "#fff", color: "#260000", border: "1px solid rgba(38,0,0,.2)" }
          }
        >
          {saved ? <Check size={16} /> : <Bookmark size={16} />}
          {saved ? "Enregistré dans mes fiches" : "Enregistrer dans mes fiches"}
        </button>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[12px] p-3 text-[13px] font-bold text-primary transition-colors hover:bg-primary/5"
        >
          Lire l'article original →
        </a>
      </aside>
    </div>
  );
}
