"use client";

import { useState } from "react";
import { ArrowBigUp, MessageSquare, Sparkles, Check, Loader2, ExternalLink } from "lucide-react";
import type { Article, CategoryId, Summary } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo, hostOf, compact } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card
      className="group mb-4 flex break-inside-avoid flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow animate-rise"
      style={{ animationDelay: `${Math.min(index * 22, 280)}ms` }}
    >
      {/* Source */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ background: color }}
          />
          <span className="truncate font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
        className="group/title inline-flex items-start gap-1 font-display text-[17px] font-bold leading-snug text-foreground hover:text-primary line-clamp-3"
      >
        {a.title}
        <ExternalLink
          size={13}
          className="mt-1 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-70"
        />
      </a>

      {/* Cover 16:9 (image ou placeholder dégradé) */}
      <CoverImage src={a.image} category={cat} source={a.source} />

      {/* Tag domaine + heure */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-black/5"
          style={{ background: `${color}26`, color: shade(color) }}
        >
          {catLabel}
        </span>
        <span className="font-mono text-xs text-muted-foreground/80">{timeAgo(a.publishedAt)}</span>
      </div>

      {a.snippet && sum.s === "idle" && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{a.snippet}</p>
      )}

      {/* Résumé IA */}
      {sum.s !== "idle" && (
        <div className="animate-rise rounded-xl border border-primary/15 bg-primary/[0.05] p-3.5 text-sm">
          {sum.s === "loading" && (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 size={14} className="animate-spin text-primary" />
              L'IA résume…
            </span>
          )}
          {sum.s === "ok" && (
            <>
              <p className="leading-relaxed text-foreground">{sum.data.summary}</p>
              {sum.data.whyItMatters && (
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  <span className="mono-label mr-1.5 text-primary">Pourquoi</span>
                  {sum.data.whyItMatters}
                </p>
              )}
            </>
          )}
          {sum.s === "no_key" && (
            <span className="text-muted-foreground">
              Ajoute <code className="font-mono text-foreground">GROQ_API_KEY</code> pour activer les résumés IA.
            </span>
          )}
          {sum.s === "error" && <span className="text-muted-foreground">Résumé indisponible, réessaie.</span>}
        </div>
      )}

      {/* Footer engagement */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="flex items-center gap-3 font-mono text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1" title="Score / upvotes">
            <ArrowBigUp size={15} className="text-primary" /> {compact(a.points)}
          </span>
          <span className="inline-flex items-center gap-1" title="Commentaires">
            <MessageSquare size={13} /> {compact(a.comments)}
          </span>
        </div>
        <Button
          onClick={summarize}
          disabled={sum.s === "loading"}
          variant={sum.s === "ok" ? "outline" : "soft"}
          size="sm"
        >
          {sum.s === "ok" ? (
            <>
              <Check size={14} /> Résumé
            </>
          ) : (
            <>
              <Sparkles size={14} /> Résumer
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

// Assombrit une couleur de domaine pour garder le texte lisible sur fond clair.
function shade(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = Math.round(parseInt(m.slice(0, 2), 16) * 0.62);
  const g = Math.round(parseInt(m.slice(2, 4), 16) * 0.62);
  const b = Math.round(parseInt(m.slice(4, 6), 16) * 0.62);
  return `rgb(${r},${g},${b})`;
}
