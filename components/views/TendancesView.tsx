"use client";

import { useEffect, useState } from "react";
import type { Article, Briefing } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { editionInfo } from "@/lib/edition";
import { fetchStats, type StatsResp } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function TendancesView({
  articles,
  briefing,
}: {
  articles: Article[];
  briefing: Briefing | null;
}) {
  const [period, setPeriod] = useState("7 j");
  const [edition, setEdition] = useState(""); // pas de "187" inventé au SSR
  const [volStats, setVolStats] = useState<StatsResp | null>(null);
  useEffect(() => {
    setEdition(editionInfo(new Date()).label); // date seule immédiate
    fetchStats().then((s) => {
      setVolStats(s);
      setEdition(editionInfo(new Date(), s?.ingestDays).label); // + Nº réel
    });
  }, []);
  const hasHist = !!volStats?.hasHistory;

  const avg =
    articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + (a.heat || 0), 0) / articles.length)
      : 0;
  const sources = Array.from(new Set(articles.map((a) => a.source)));

  // Répartition par thème.
  const domains = CATEGORIES.filter((c) => c.id !== "all");
  const total = articles.length || 1;
  const breakdown = domains
    .map((d) => {
      const n = articles.filter((a) => a.category === d.id).length;
      return { label: d.label, color: d.color, pct: Math.round((n / total) * 100), n };
    })
    .filter((b) => b.n > 0)
    .sort((a, b) => b.n - a.n);

  // Sources les plus actives.
  const bySource: Record<string, number> = {};
  for (const a of articles) bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Sujets qui montent : top tags du flux, sinon repli sur les domaines.
  const byTag: Record<string, number> = {};
  for (const a of articles) for (const t of a.tags ?? []) {
    const k = (t || "").trim();
    if (k) byTag[k] = (byTag[k] ?? 0) + 1;
  }
  const topTags = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const sujetsFallback =
    topTags.length >= 3
      ? topTags.map(([label, n]) => ({ label, n }))
      : breakdown.slice(0, 5).map((b) => ({ label: b.label, n: b.n }));
  const maxSujetFb = sujetsFallback[0]?.n || 1;

  // Sujets qui montent — VRAIES variations si l'historique existe, sinon volume.
  const risers = hasHist
    ? volStats!.topics
        .filter((t) => t.variation > 0)
        .slice(0, 5)
        .map((t) => ({ label: t.label, display: `+${t.variation} %`, bar: t.variation }))
    : sujetsFallback.map((s) => ({
        label: s.label,
        display: String(s.n),
        bar: Math.round((s.n / maxSujetFb) * 100),
      }));
  const maxBar = Math.max(1, ...risers.map((r) => r.bar));

  // "Ce qui a chuté" (vrai) sinon "Le moins couvert" (volume le plus faible).
  const fallers = hasHist
    ? volStats!.topics
        .filter((t) => t.variation < 0)
        .sort((a, b) => a.variation - b.variation)
        .slice(0, 3)
        .map((t) => ({ label: t.label, display: `${t.variation} %`, sub: "vs 7 j préc." }))
    : (topTags.length >= 3
        ? Object.entries(byTag)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .map(([label, n]) => ({ label, n }))
        : breakdown.slice().reverse().slice(0, 3).map((b) => ({ label: b.label, n: b.n }))
      ).map((q) => ({ label: q.label, display: String(q.n), sub: `art. · ${period}` }));

  const stats = [
    { value: String(articles.length), unit: "", label: "Articles analysés" },
    { value: String(sources.length), unit: "", label: "Sources surveillées" },
    { value: String(avg), unit: "/100", label: "Pertinence moyenne" },
    { value: String(breakdown[0]?.pct ?? 0), unit: "%", label: `Dominé par ${breakdown[0]?.label ?? "—"}` },
  ];

  const signals = [
    hasHist && risers[0] && `${risers[0].label} en forte hausse (${risers[0].display}) sur 7 jours.`,
    briefing?.watch,
    breakdown[0] && `${breakdown[0].label} domine le flux (${breakdown[0].pct} %).`,
    topSources[0] && `${topSources[0][0]} est la source la plus active du moment.`,
  ].filter(Boolean) as string[];

  return (
    <div className="pb-6">
      {/* En-tête chapitre */}
      <div className="mb-3 flex items-center gap-3">
        <span className="h-[7px] w-[7px] animate-pulseDot rounded-full bg-primary" />
        <span className="truncate font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">
          Le pouls · {edition}
        </span>
        <span className="h-px flex-1 bg-border" />
        <div className="flex shrink-0 gap-0.5 rounded-full bg-foreground/[0.06] p-[3px]">
          {["7 j", "30 j", "90 j"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full px-[11px] py-[4px] text-[11px] font-semibold transition-colors",
                period === p
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(26,10,8,.1)]"
                  : "text-foreground/50 hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <h1 className="mb-1 text-[28px] font-bold tracking-[-0.02em] text-foreground">
        Le pouls de l'écosystème.
      </h1>
      <p className="mb-6 max-w-[520px] text-[13.5px] text-foreground/55">
        Ce que Radar détecte, mesure et classe — sans que tu aies à tout lire.
      </p>

      {/* Stats */}
      <div className="mb-[18px] grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] bg-[#1A0A08] p-[20px_22px]">
            <div className="text-[26px] font-bold leading-none text-[#FFF7EA]">
              {s.value}
              <span className="text-[13px] font-medium text-[#FFF7EA]/50">{s.unit}</span>
            </div>
            <div className="mt-2 text-[11.5px] leading-[1.35] text-[#FFF7EA]/55">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sujets qui montent · Répartition par thème */}
      <div className="mb-[18px] grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-[14px] border border-border bg-card p-[22px_24px]">
          <div className="flex items-baseline justify-between">
            <div className="text-[14px] font-semibold text-foreground">Sujets qui montent</div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
              Top {risers.length} · {period}
            </div>
          </div>
          <div className="mb-4 text-[12px] text-foreground/45">
            {hasHist ? "Variation de volume vs 7 jours précédents" : "Volume dans le flux, croisement des sources"}
          </div>
          {risers.length === 0 ? (
            <div className="py-4 text-[12.5px] text-foreground/45">
              Aucune hausse détectée sur la période.
            </div>
          ) : (
            risers.map((s) => (
              <div key={s.label} className="mb-3.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-2.5">
                  <span className="truncate text-[13.5px] font-medium text-foreground">{s.label}</span>
                  <span className="font-mono text-[13px] font-semibold text-[#4E8D6E]">{s.display}</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-[5px] bg-foreground/[0.08]">
                  <div
                    className="h-full rounded-[5px]"
                    style={{
                      width: `${Math.round((s.bar / maxBar) * 100)}%`,
                      background: "linear-gradient(90deg,#FF5A47,#FFB09E)",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px]">
          <div className="flex items-baseline justify-between">
            <div className="text-[14px] font-semibold text-foreground">Répartition par thème</div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
              {articles.length} · 24 h
            </div>
          </div>
          <div className="mb-4 text-[12px] text-foreground/45">La journée en pourcentages</div>
          {/* Barre empilée */}
          <div className="mb-[18px] flex h-[14px] overflow-hidden rounded-full bg-foreground/[0.06]">
            {breakdown.map((b) => (
              <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} />
            ))}
          </div>
          {breakdown.map((b) => (
            <div key={b.label} className="mb-2.5 flex items-center gap-2.5">
              <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: b.color }} />
              <span className="flex-1 truncate text-[12.5px] text-foreground">{b.label}</span>
              <span className="font-mono text-[12.5px] font-semibold text-foreground">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signaux faibles · Sources les plus actives */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] bg-primary p-[22px_24px] text-[#FFF7EA]">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFF7EA]/90">
              Signaux faibles détectés
            </div>
            <div className="rounded-full bg-[#1A0A08] px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              {String(signals.length).padStart(2, "0")} · {period}
            </div>
          </div>
          {signals.length ? (
            signals.map((g, i) => (
              <div key={i} className="flex items-start gap-3 border-t border-[#FFF7EA]/15 py-2.5">
                <span className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#FFF7EA]/20 text-[11px] font-bold text-[#FFF7EA]">
                  →
                </span>
                <span className="text-[12.5px] font-medium leading-[1.4] text-[#FFF7EA]">{g}</span>
              </div>
            ))
          ) : (
            <div className="text-[12.5px] text-[#FFF7EA]/85">
              Génère le brief du jour pour révéler les signaux faibles.
            </div>
          )}
        </div>

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px]">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="text-[14px] font-semibold text-foreground">Sources les plus actives</div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
              Top {topSources.length} · 24 h
            </div>
          </div>
          {topSources.map(([name, n]) => (
            <div
              key={name}
              className="flex items-center justify-between gap-2.5 border-t border-border py-[9px]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#4E8D6E]" />
                <span className="truncate text-[13px] font-semibold text-foreground">{name}</span>
              </div>
              <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ce qui a chuté (vrai) / Le moins couvert (repli) */}
      {fallers.length > 0 && (
        <div className="mt-[18px] rounded-[14px] border border-border bg-card p-[22px_24px]">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="text-[14px] font-semibold text-foreground">
              {hasHist ? "Ce qui a chuté cette semaine" : "Le moins couvert cette semaine"}
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
              Volume ↓
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {fallers.map((q) => (
              <div key={q.label} className="rounded-[11px] bg-foreground/[0.04] p-[14px_16px]">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-[22px] font-bold tracking-[-0.02em] text-[#C8663A]">{q.display}</span>
                  <span className="font-mono text-[11px] text-foreground/45">{q.sub}</span>
                </div>
                <div className="truncate text-[12.5px] font-medium text-foreground">{q.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
