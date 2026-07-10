"use client";

import { useState } from "react";
import { Loader2, Sparkles, Share2, Link2, Hash, Mail, FileDown, X } from "lucide-react";
import type { Article, Briefing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";

// Thèmes des 3 signaux (design 4a) : Data & IA · Tech · Business.
const HL = [
  { label: "Data & IA", color: "#8E5FB8" },
  { label: "Tech", color: "#C8663A" },
  { label: "Business", color: "#4E8D6E" },
];
const pad2 = (n: number) => (n < 10 ? "0" : "") + n;

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
  const [shareOpen, setShareOpen] = useState(false);

  const avg =
    articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + (a.heat || 0), 0) / articles.length)
      : 0;
  const sourcesCount = new Set(articles.map((a) => a.source)).size;
  const numbers = [
    { value: String(analyzed), unit: "", label: "Articles analysés" },
    { value: String(sourcesCount), unit: "", label: "Sources surveillées" },
    { value: String(avg), unit: "/100", label: "Pertinence moyenne" },
  ];

  // Signaux faibles : le "watch" IA + 2 signaux dérivés du flux réel.
  const domains = CATEGORIES.filter((c) => c.id !== "all");
  const topDom = domains
    .map((d) => ({ label: d.label, n: articles.filter((a) => a.category === d.id).length }))
    .sort((a, b) => b.n - a.n)[0];
  const bySource: Record<string, number> = {};
  for (const a of articles) bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]?.[0];
  const signals = [
    briefing?.watch,
    topDom && topDom.n > 0 && `${topDom.label} domine le flux du jour (${topDom.n} articles).`,
    topSource && `${topSource} est la source la plus active aujourd'hui.`,
  ].filter(Boolean) as string[];

  return (
    <div className="pb-6">
      {/* En-tête : label auto-généré + Partager */}
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          Brief du jour · auto-généré
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShareOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-[7px] text-[11.5px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Share2 size={13} /> Partager
          </button>
          {shareOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShareOpen(false)} />
              <div className="absolute right-0 top-10 z-40 w-[270px] rounded-[14px] border border-border bg-popover p-2 shadow-[0_24px_48px_-14px_rgba(26,10,8,.3)]">
                <div className="flex items-center px-2.5 pb-2 pt-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/55">
                    Partager le brief
                  </span>
                  <button
                    onClick={() => setShareOpen(false)}
                    className="ml-auto text-foreground/40 hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
                <ShareItem
                  icon={<Link2 size={14} />}
                  color="#FF5A47"
                  label="Copier le lien"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                    setShareOpen(false);
                  }}
                />
                <ShareItem icon={<Hash size={14} />} color="#4E8D6E" label="Envoyer sur Slack" onClick={() => setShareOpen(false)} />
                <ShareItem icon={<Mail size={14} />} color="#C8663A" label="Par email" onClick={() => setShareOpen(false)} />
                <ShareItem icon={<FileDown size={14} />} color="#8E5FB8" label="Télécharger en PDF" onClick={() => setShareOpen(false)} />
              </div>
            </>
          )}
        </div>
      </div>

      <h1 className="mb-3.5 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
        Ce qui ressort du flux aujourd'hui
      </h1>
      <p className="mb-[26px] max-w-[680px] text-[14.5px] leading-[1.6] text-foreground/[0.62]">
        Voici ce que Radar a retenu des {analyzed} articles analysés depuis hier, classés par impact
        pour tes prochaines conversations.
      </p>

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
          {/* Hero décoratif — juste au-dessus des 3 choses à retenir */}
          <div
            className="relative mb-9 h-[200px] overflow-hidden rounded-[18px]"
            style={{ background: "linear-gradient(135deg,#FF5A47 0%,#C8663A 55%,#1A0A08 130%)" }}
          >
            <svg
              viewBox="0 0 200 200"
              className="pointer-events-none absolute -right-8 -top-8 h-[260px] w-[260px] opacity-20"
            >
              <circle cx="100" cy="100" r="40" fill="none" stroke="#FFF7EA" strokeWidth="1" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#FFF7EA" strokeWidth="1" />
              <circle cx="100" cy="100" r="96" fill="none" stroke="#FFF7EA" strokeWidth="1" />
              <circle cx="100" cy="100" r="4" fill="#FFF7EA" />
            </svg>
            <div className="absolute bottom-6 left-7 right-7">
              <div className="mb-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/85">
                Radar · signal du jour
              </div>
              <div className="text-[24px] font-bold leading-[1.15] text-white">
                Ce qui ressort du flux, en un coup d'œil.
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[760px]">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
            3 choses à retenir
          </div>
          {briefing.trends.slice(0, 3).map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-[64px_1fr] items-start gap-6 border-t border-border py-8 sm:grid-cols-[100px_1fr] sm:gap-8"
            >
              <div
                className="text-[56px] font-bold leading-[0.85] tracking-[-0.05em] sm:text-[78px]"
                style={{ color: HL[i % HL.length].color }}
              >
                {pad2(i + 1)}
              </div>
              <div className="min-w-0">
                <div
                  className="mb-2.5 inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: HL[i % HL.length].color }}
                >
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ background: HL[i % HL.length].color }}
                  />
                  {HL[i % HL.length].label}
                </div>
                <div className="mb-3 text-[22px] font-bold leading-[1.15] tracking-[-0.015em] text-foreground">
                  {t.title}
                </div>
                <div className="max-w-[540px] text-[14px] leading-[1.65] text-foreground/[0.66]">
                  {t.why}
                </div>
              </div>
            </div>
          ))}
          </div>

          {/* Les chiffres du jour */}
          <div className="mt-7 rounded-[16px] bg-[#1A0A08] p-[28px_32px]">
            <div className="mb-[18px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              Les chiffres du jour
            </div>
            <div className="grid grid-cols-3 gap-4">
              {numbers.map((n) => (
                <div key={n.label} className="min-w-0">
                  <div className="text-[40px] font-bold leading-none tracking-[-0.035em] text-[#FFF7EA] sm:text-[44px]">
                    {n.value}
                    <span className="text-[17px] font-medium text-[#FFF7EA]/50">{n.unit}</span>
                  </div>
                  <div className="mt-2 truncate text-[11.5px] text-[#FFF7EA]/55">{n.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* À surveiller · signaux faibles */}
          <div className="mt-3.5 rounded-[14px] border border-border bg-card p-[22px_24px]">
            <div className="mb-3.5 flex items-baseline justify-between">
              <div className="text-[14px] font-semibold text-foreground">
                À surveiller · signaux faibles
              </div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/40">
                {pad2(signals.length)} détectés
              </div>
            </div>
            {signals.length ? (
              signals.map((g, i) => (
                <div key={i} className="flex items-start gap-3 border-t border-border py-2.5">
                  <span className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    →
                  </span>
                  <span className="text-[13px] font-medium leading-[1.45] text-foreground/[0.78]">
                    {g}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[13px] text-foreground/55">
                Aucun signal faible détecté pour l'instant.
              </div>
            )}
          </div>

          {/* La punchline de secours */}
          <div
            className="mt-3.5 rounded-[14px] p-[22px_24px]"
            style={{ background: "rgba(255,90,71,.12)", border: "1px solid rgba(255,90,71,.28)" }}
          >
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[#E0503F]">
              La punchline de secours
            </div>
            <div className="text-[16px] italic leading-[1.5] text-foreground">
              « {briefing.headline} »
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ShareItem({
  icon,
  color,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.04]"
    >
      <span
        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
