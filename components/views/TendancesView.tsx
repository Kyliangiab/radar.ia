"use client";

import type { Article, Briefing } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

export function TendancesView({
  articles,
  briefing,
  analyzed,
}: {
  articles: Article[];
  briefing: Briefing | null;
  analyzed: number;
}) {
  const avg =
    articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + (a.heat || 0), 0) / articles.length)
      : 0;

  const domains = CATEGORIES.filter((c) => c.id !== "all");
  const total = articles.length || 1;
  const breakdown = domains
    .map((d) => {
      const n = articles.filter((a) => a.category === d.id).length;
      return { label: d.label, color: d.color, pct: Math.round((n / total) * 100), n };
    })
    .sort((a, b) => b.n - a.n);

  // "Sujets qui montent" : top sources par volume (proxy réel)
  const bySource: Record<string, number> = {};
  for (const a of articles) bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxSrc = topSources.length ? topSources[0][1] : 1;

  const stats = [
    { value: String(analyzed), unit: "", label: "Articles analysés aujourd'hui" },
    { value: "10", unit: "", label: "Sources surveillées" },
    { value: String(articles.length), unit: "", label: "Dans le flux courant" },
    { value: String(avg), unit: "/100", label: "Pertinence moyenne" },
  ];

  const signals = [
    briefing?.watch,
    breakdown[0] && `${breakdown[0].label} domine le flux (${breakdown[0].pct} %).`,
    topSources[0] && `${topSources[0][0]} est la source la plus active du moment.`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="mb-1 text-[22px] font-bold tracking-[-0.01em] text-foreground">Tendances</div>
      <div className="mb-5 text-[13px] text-foreground/50">
        Ce que Radar détecte dans le flux — sans que vous ayez à tout lire.
      </div>

      {/* Stat cards */}
      <div className="mb-[18px] grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[16px] bg-foreground p-[20px_22px]">
            <div className="text-[28px] font-bold leading-none text-background">
              {s.value}
              <span className="text-[14px] font-medium text-background/50"> {s.unit}</span>
            </div>
            <div className="mt-2 text-[12px] text-background/55">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Sujets qui montent (top sources) */}
        <div className="rounded-[16px] border border-border bg-card p-[22px_24px]">
          <div className="mb-0.5 text-[14px] font-semibold text-foreground">Sources les plus actives</div>
          <div className="mb-[18px] text-[12px] text-foreground/45">Volume d'articles dans le flux courant</div>
          {topSources.map(([name, n]) => (
            <div key={name} className="mb-4">
              <div className="mb-[7px] flex items-baseline justify-between">
                <span className="text-[13.5px] font-medium text-foreground">{name}</span>
                <span className="text-[12.5px] font-semibold text-[#4E8D6E]">{n}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-[5px] bg-foreground/[0.08]">
                <div
                  className="h-full rounded-[5px] bg-primary"
                  style={{ width: `${Math.round((n / maxSrc) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {/* Répartition par thème */}
          <div className="rounded-[16px] border border-border bg-card p-[22px_24px]">
            <div className="mb-4 text-[14px] font-semibold text-foreground">Répartition par thème</div>
            {breakdown.map((b) => (
              <div key={b.label} className="mb-3 flex items-center gap-2.5">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: b.color }} />
                <span className="w-[92px] shrink-0 text-[12.5px] text-foreground">{b.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-[4px] bg-foreground/[0.08]">
                  <div className="h-full" style={{ width: `${b.pct}%`, background: b.color }} />
                </div>
                <span className="w-[34px] text-right text-[11.5px] text-foreground/50">{b.pct}%</span>
              </div>
            ))}
          </div>

          {/* Signaux faibles */}
          <div className="rounded-[16px] bg-primary p-[20px_24px]">
            <div className="mb-3 text-[12.5px] font-semibold text-foreground">Signaux faibles détectés</div>
            {signals.length ? (
              signals.map((g, i) => (
                <div key={i} className="relative mb-2.5 pl-3.5 text-[12.5px] leading-[1.4] text-foreground">
                  <span className="absolute left-0">·</span>
                  {g}
                </div>
              ))
            ) : (
              <div className="text-[12.5px] text-foreground/70">
                Génère le brief du jour pour révéler les signaux faibles.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
