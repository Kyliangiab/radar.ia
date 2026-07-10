"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { Article, Briefing } from "@/lib/types";
import { Button } from "@/components/ui/button";

const HL_COLORS = ["#C8663A", "#4E8D6E", "#8E5FB8", "#B4568F"];

export function BriefView({
  briefing,
  loading,
  analyzed,
  articles,
  onGenerate,
}: {
  briefing: Briefing | null;
  loading: boolean;
  analyzed: number;
  articles: Article[];
  onGenerate: () => void;
}) {
  const avg =
    articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + (a.heat || 0), 0) / articles.length)
      : 0;
  const numbers = [
    { value: String(analyzed), label: "Articles analysés" },
    { value: "10", label: "Sources surveillées" },
    { value: `${avg}/100`, label: "Pertinence moyenne" },
  ];

  return (
    <div className="mx-auto max-w-[860px] pb-6">
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
        Brief du jour · auto-généré
      </div>
      <h1 className="mb-4 text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
        {briefing?.headline || "Ce qui ressort du flux aujourd'hui"}
      </h1>
      <p className="mb-[26px] max-w-[660px] text-[15px] leading-[1.65] text-foreground/60">
        Voici ce que Radar a retenu des {analyzed} articles analysés depuis hier, classés par
        impact pour vos prochaines conversations.
      </p>

      {/* Hero décoratif */}
      <div
        className="mb-9 flex h-[230px] items-end overflow-hidden rounded-[18px] p-7"
        style={{ background: "linear-gradient(135deg,#FF5A47 0%,#1A0A08 120%)" }}
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          Radar · signal du jour
        </div>
      </div>

      {!briefing && (
        <div className="mb-8 rounded-[16px] border border-border bg-card p-8 text-center">
          <p className="mb-4 text-[14px] text-foreground/60">
            {loading ? "L'IA analyse le flux…" : "Génère le brief du jour à partir du flux."}
          </p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Analyse…" : "Générer le brief"}
          </Button>
        </div>
      )}

      {briefing && (
        <>
          <div className="mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
            3 choses à retenir
          </div>
          {briefing.trends.slice(0, 3).map((t, i) => (
            <div key={i} className="flex gap-[22px] border-t border-border py-6">
              <div
                className="w-10 shrink-0 text-[38px] font-bold leading-none"
                style={{ color: HL_COLORS[i % HL_COLORS.length] }}
              >
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="mb-[9px] text-[19px] font-semibold leading-[1.3] text-foreground">
                  {t.title}
                </div>
                <div className="text-[14px] leading-[1.65] text-foreground/[0.66]">{t.why}</div>
              </div>
            </div>
          ))}

          {/* Chiffres du jour */}
          <div className="mt-8 rounded-[18px] bg-foreground p-[26px_28px]">
            <div className="mb-[18px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.07em] text-primary">
              Les chiffres du jour
            </div>
            <div className="flex flex-wrap gap-11">
              {numbers.map((n) => (
                <div key={n.label}>
                  <div className="text-[30px] font-bold leading-none text-background">{n.value}</div>
                  <div className="mt-1.5 text-[12px] text-background/55">{n.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* À surveiller + punchline */}
          <div className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <div className="rounded-[16px] border border-border bg-card p-[22px_24px]">
              <div className="mb-3.5 text-[13px] font-semibold text-foreground">À surveiller</div>
              <div className="relative pl-4 text-[13px] leading-[1.45] text-foreground/[0.72]">
                <span className="absolute left-0 font-bold text-primary">·</span>
                {briefing.watch}
              </div>
            </div>
            <div
              className="flex flex-col justify-center rounded-[16px] p-[22px_24px]"
              style={{ background: "rgba(255,90,71,.12)", border: "1px solid rgba(255,90,71,.3)" }}
            >
              <div className="mb-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#E0503F]">
                La punchline de secours
              </div>
              <div className="text-[16px] italic leading-[1.45] text-foreground">
                « {briefing.headline} »
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
