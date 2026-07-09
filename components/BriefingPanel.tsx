"use client";

import { useState } from "react";
import type { Article, Briefing } from "@/lib/types";

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
    <section className="panel p-5 sm:p-6 mb-8 overflow-hidden relative">
      {/* ligne de scan décorative */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{
          background:
            "linear-gradient(90deg,#CA2851,#FF6766,#FFB173,#FFE3B3)",
        }}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label mb-1.5">Briefing IA · Signal du jour</p>
          <h2 className="font-display text-xl sm:text-2xl font-semibold leading-tight">
            Ce qui ressort du flux, résumé par l'IA
          </h2>
        </div>
        <button
          onClick={generate}
          disabled={state.status === "loading" || articles.length === 0}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-accent/15 border border-accent/40 px-4 py-2 text-sm font-semibold text-ink hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {state.status === "loading" ? (
            <>
              <Spinner /> Analyse…
            </>
          ) : state.status === "ok" ? (
            "Régénérer"
          ) : (
            "Générer le briefing"
          )}
        </button>
      </div>

      {state.status === "idle" && (
        <p className="text-muted text-sm mt-4 max-w-2xl">
          L'IA lit les titres phares du jour et en dégage les tendances, les
          signaux faibles et ce qu'il faut surveiller.
        </p>
      )}

      {state.status === "loading" && (
        <div className="mt-5 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-panel2/60 border border-line animate-pulse"
            />
          ))}
        </div>
      )}

      {state.status === "no_key" && (
        <div className="mt-4 rounded-xl border border-hot/40 bg-hot/10 p-4 text-sm">
          <p className="font-semibold text-ink mb-1">Clé IA manquante</p>
          <p className="text-muted">
            Ajoute <code className="font-mono text-ink">GROQ_API_KEY</code> dans
            tes variables d'environnement (fichier <code className="font-mono">.env.local</code> en
            local, ou réglages Vercel) pour activer le briefing et les résumés.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-4 rounded-xl border border-line bg-panel2/60 p-4 text-sm text-muted">
          L'analyse n'a pas abouti. Réessaie dans un instant.
        </div>
      )}

      {state.status === "ok" && (
        <div className="mt-5 animate-rise">
          <p className="font-display text-lg text-ink mb-4">
            <span className="text-accent">›</span> {state.data.headline}
          </p>
          <ol className="grid gap-3 sm:grid-cols-2">
            {state.data.trends.map((t, i) => (
              <li
                key={i}
                className="rounded-xl border border-line bg-panel2/50 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold text-ink text-sm">{t.title}</span>
                </div>
                <p className="text-muted text-sm leading-relaxed">{t.why}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            <span className="mono-label mr-2 text-hot">À surveiller</span>
            {state.data.watch}
          </p>
        </div>
      )}
    </section>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
  );
}
