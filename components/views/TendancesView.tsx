"use client";

import type { Article, Briefing } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

export function TendancesView({
  articles,
  briefing,
}: {
  articles: Article[];
  briefing: Briefing | null;
}) {
  const avg =
    articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + (a.heat || 0), 0) / articles.length)
      : 0;
  const sources = Array.from(new Set(articles.map((a) => a.source)));

  const domains = CATEGORIES.filter((c) => c.id !== "all");
  const total = articles.length || 1;
  const breakdown = domains
    .map((d) => {
      const n = articles.filter((a) => a.category === d.id).length;
      return { label: d.label, color: d.color, pct: Math.round((n / total) * 100), n };
    })
    .sort((a, b) => b.n - a.n);

  const bySource: Record<string, number> = {};
  for (const a of articles) bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxSrc = topSources.length ? topSources[0][1] : 1;

  const stats = [
    { value: String(articles.length), unit: "", label: "Articles analysés aujourd'hui" },
    { value: String(sources.length), unit: "", label: "Sources surveillées" },
    { value: `${avg}`, unit: "/100", label: "Pertinence moyenne" },
    { value: String(breakdown[0]?.pct ?? 0), unit: "%", label: `Dominé par ${breakdown[0]?.label ?? "—"}` },
  ];

  const signals = [
    briefing?.watch,
    breakdown[0] && `${breakdown[0].label} domine le flux (${breakdown[0].pct} %).`,
    topSources[0] && `${topSources[0][0]} est la source la plus active du moment.`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-[7px] w-[7px] animate-pulseDot rounded-full bg-primary" />
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">
          Le pouls · Ed. du jour
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <h1 className="mb-1 text-[28px] font-bold tracking-[-0.02em] text-foreground">
        Le pouls de l'écosystème.
      </h1>
      <p className="mb-6 max-w-[520px] text-[13.5px] text-foreground/55">
        Ce que Radar détecte, mesure et classe — sans que tu aies à tout lire.
      </p>

      {/* Stat cards */}
      <div className="mb-[18px] grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[16px] bg-foreground p-[20px_22px]">
            <div className="text-[26px] font-bold leading-none text-background">
              {s.value}
              <span className="text-[13px] font-medium text-background/50">{s.unit}</span>
            </div>
            <div className="mt-2 text-[11.5px] leading-[1.35] text-background/55">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Sources les plus actives */}
        <div className="rounded-[16px] border border-border bg-card p-[22px_24px]">
          <div className="text-[14px] font-semibold text-foreground">Sources les plus actives</div>
          <div className="mb-4 text-[12px] text-foreground/45">Volume d'articles dans le flux</div>
          {topSources.map(([name, n]) => (
            <div key={name} className="mb-3.5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[13.5px] font-medium text-foreground">{name}</span>
                <span className="font-mono text-[12px] font-semibold text-[#4E8D6E]">{n}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-[5px] bg-foreground/[0.08]">
                <div
                  className="h-full rounded-[5px]"
                  style={{
                    width: `${Math.round((n / maxSrc) * 100)}%`,
                    background: "linear-gradient(90deg,#FF5A47,#FFB09E)",
                  }}
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
          <div className="rounded-[16px] bg-primary p-[20px_24px] text-white">
            <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/85">
              Signaux faibles détectés
            </div>
            {signals.length ? (
              signals.map((g, i) => (
                <div key={i} className="relative mb-2.5 pl-3.5 text-[12.5px] leading-[1.4]">
                  <span className="absolute left-0">·</span>
                  {g}
                </div>
              ))
            ) : (
              <div className="text-[12.5px] text-white/85">
                Génère le brief du jour pour révéler les signaux faibles.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
