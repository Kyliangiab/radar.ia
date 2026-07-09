"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, Eye, Loader2, KeyRound } from "lucide-react";
import type { Article, Briefing } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: Briefing }
  | { status: "no_key" }
  | { status: "error" };

export function BriefingPanel({ articles }: { articles: Article[] }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: articles.slice(0, 22).map((a) => ({
            title: a.title,
            source: a.source,
            category: a.category,
            points: a.points,
            comments: a.comments,
          })),
        }),
      });
      const data = await res.json();
      if (data?.error === "no_key") return setState({ status: "no_key" });
      if (data?.error || !data?.trends) return setState({ status: "error" });
      setState({ status: "ok", data });
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <Card className="relative mb-8 overflow-hidden">
      {/* bandeau signature */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg,#8A2E12,#E35C2B,#FFB200,#FBF7EE)" }}
      />
      {/* halo corail discret */}
      <span
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.25)" }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="mono-label mb-0.5">Briefing IA · Signal du jour</p>
              <h2 className="font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                Ce qui ressort du flux
              </h2>
            </div>
          </div>
          <Button
            onClick={generate}
            disabled={state.status === "loading" || articles.length === 0}
            className="shrink-0"
          >
            {state.status === "loading" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Analyse…
              </>
            ) : state.status === "ok" ? (
              <>
                <Sparkles size={16} /> Régénérer
              </>
            ) : (
              <>
                <Sparkles size={16} /> Générer le briefing
              </>
            )}
          </Button>
        </div>

        {state.status === "idle" && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            L'IA lit les titres phares du jour et en dégage les tendances, les signaux
            faibles et ce qu'il faut surveiller.
          </p>
        )}

        {state.status === "loading" && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-muted/50" />
            ))}
          </div>
        )}

        {state.status === "no_key" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <KeyRound size={18} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">Clé IA manquante. </span>
              Ajoute <code className="font-mono text-foreground">GROQ_API_KEY</code> dans tes
              variables d'environnement pour activer le briefing et les résumés.
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-4 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            L'analyse n'a pas abouti. Réessaie dans un instant.
          </div>
        )}

        {state.status === "ok" && (
          <div className="mt-5 animate-rise">
            {/* Headline */}
            <div className="mb-5 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
              <p className="font-display text-lg font-semibold leading-snug text-foreground">
                {state.data.headline}
              </p>
            </div>

            {/* Tendances */}
            <ol className="grid gap-3 sm:grid-cols-2">
              {state.data.trends.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/12 font-mono text-xs font-bold text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <TrendingUp size={14} className="shrink-0 text-primary" />
                      {t.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.why}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* À surveiller */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border-l-[3px] border-l-hot bg-muted/40 p-3.5">
              <Eye size={16} className="mt-0.5 shrink-0 text-hot" />
              <p className="text-sm text-muted-foreground">
                <span className="mono-label mr-1.5 text-hot">À surveiller</span>
                {state.data.watch}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
