"use client";

import { useState } from "react";
import type { Article, CategoryId, Summary } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo, hostOf, compact } from "@/lib/format";
import { SignalBars } from "./SignalBars";
import { CoverImage } from "./CoverImage";

type SumState =
  | { s: "idle" }
  | { s: "loading" }
  | { s: "ok"; data: Summary }
  | { s: "no_key" }
  | { s: "error" };

export function ArticleCard({ a, index }: { a: Article; index: number }) {
  const [sum, setSum] = useState<SumState>(
    a.summary
      ? { s: "ok", data: { summary: a.summary, whyItMatters: a.whyItMatters ?? "" } }
      : { s: "idle" },
  );
  const color = categoryColor(a.category);
  const cat: CategoryId = (CATEGORY_MAP[a.category] ? a.category : "tech") as CategoryId;
  const catLabel = CATEGORY_MAP[cat]?.label ?? "Tech";

  async function summarize() {
    if (sum.s === "loading") return;
    setSum({ s: "loading" });
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: a.title, snippet: a.snippet ?? "", source: a.source }),
      });
      const data = await res.json();
      if (data?.error === "no_key") return setSum({ s: "no_key" });
      if (data?.error || !data?.summary) return setSum({ s: "error" });
      setSum({ s: "ok", data });
    } catch {
      setSum({ s: "error" });
    }
  }

  return (
    <article
      className="group mb-4 flex break-inside-avoid flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-panel transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-panel2/60 animate-rise"
      style={{ animationDelay: `${Math.min(index * 22, 280)}ms` }}
    >
      {/* Source */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate font-mono text-[11px] uppercase tracking-wider text-faint">
            {a.source} · {hostOf(a.url)}
          </span>
        </div>
        <SignalBars heat={a.heat} />
      </div>

      {/* Titre */}
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display text-[17px] font-semibold leading-snug text-ink hover:text-accent line-clamp-3"
      >
        {a.title}
      </a>

      {/* Cover 16:9 (image ou placeholder dégradé) */}
      <CoverImage src={a.image} category={cat} source={a.source} />

      {/* Tag domaine + heure */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `${color}22`, color }}
        >
          {catLabel}
        </span>
        <span className="font-mono text-xs text-faint">{timeAgo(a.publishedAt)}</span>
      </div>

      {a.snippet && sum.s === "idle" && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{a.snippet}</p>
      )}

      {/* Résumé IA */}
      {sum.s !== "idle" && (
        <div className="animate-rise rounded-xl border border-line bg-panel2/50 p-3.5 text-sm">
          {sum.s === "loading" && (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink/30 border-t-accent" />
              L'IA résume…
            </span>
          )}
          {sum.s === "ok" && (
            <>
              <p className="leading-relaxed text-ink">{sum.data.summary}</p>
              {sum.data.whyItMatters && (
                <p className="mt-2 leading-relaxed text-muted">
                  <span className="mono-label mr-1.5 text-accent">Pourquoi</span>
                  {sum.data.whyItMatters}
                </p>
              )}
            </>
          )}
          {sum.s === "no_key" && (
            <span className="text-muted">
              Ajoute <code className="font-mono text-ink">GROQ_API_KEY</code> pour activer les résumés IA.
            </span>
          )}
          {sum.s === "error" && <span className="text-muted">Résumé indisponible, réessaie.</span>}
        </div>
      )}

      {/* Footer engagement */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 font-mono text-xs text-faint">
          <span title="Score / upvotes">▲ {compact(a.points)}</span>
          <span title="Commentaires">✦ {compact(a.comments)}</span>
        </div>
        <button
          onClick={summarize}
          disabled={sum.s === "loading"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2/60 px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-50"
        >
          {sum.s === "ok" ? "Résumé ✓" : "Résumer"}
        </button>
      </div>
    </article>
  );
}
