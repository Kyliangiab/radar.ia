"use client";

import { Loader2 } from "lucide-react";
import type { Briefing } from "@/lib/types";

// Thèmes des 3 signaux (design 4a) : Data & IA · Tech · Business.
const HL = [
  { label: "Data & IA", color: "#8E5FB8" },
  { label: "Tech", color: "#C8663A" },
  { label: "Business", color: "#4E8D6E" },
];

export function BriefBanner({
  briefing,
  loading,
  analyzed,
  onOpen,
}: {
  briefing: Briefing | null;
  loading: boolean;
  analyzed: number;
  onOpen: () => void;
}) {
  const trends = briefing?.trends?.slice(0, 3) ?? [];

  return (
    <div
      onClick={onOpen}
      className="group relative mb-8 flex cursor-pointer items-stretch overflow-hidden rounded-[18px] bg-[#1A0A08] text-[#FFF7EA] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-20px_rgba(26,10,8,.4)]"
    >
      {/* Filigrane "B" */}
      <div
        className="pointer-events-none absolute -top-6 right-[168px] select-none font-serif text-[200px] font-bold leading-[0.7] tracking-[-0.06em]"
        style={{ color: "rgba(255,90,71,.07)" }}
      >
        B
      </div>

      <div className="relative min-w-0 flex-1 p-[26px_32px]">
        <div className="mb-2.5 inline-flex items-center gap-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">
          <span className="h-[7px] w-[7px] animate-pulseDot rounded-full bg-primary" />
          Le brief du jour
        </div>
        <div className="mb-1.5 text-[20px] font-bold leading-[1.15] tracking-[-0.012em] text-[#FFF7EA]">
          {briefing?.headline || "Ce qui ressort du flux aujourd'hui."}
        </div>
        <div className="mb-[18px] text-[12px] text-[#FFF7EA]/55">
          {trends.length || 3} signaux à retenir · {analyzed} articles analysés depuis hier
        </div>

        {loading && !briefing ? (
          <div className="flex items-center gap-2 text-[12.5px] text-[#FFF7EA]/55">
            <Loader2 size={15} className="animate-spin text-primary" /> Analyse du flux par l'IA…
          </div>
        ) : (
          <div className="flex flex-wrap gap-[26px]">
            {(trends.length ? trends : PLACEHOLDER).map((t, i) => (
              <div key={i} className="flex max-w-[200px] flex-1 gap-[9px]">
                <div
                  className="shrink-0 text-[20px] font-bold leading-[0.95] tracking-[-0.03em]"
                  style={{ color: HL[i % HL.length].color }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div
                    className="mb-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: HL[i % HL.length].color }}
                  >
                    {HL[i % HL.length].label}
                  </div>
                  <div className="text-[12px] font-semibold leading-[1.3] text-[#FFF7EA]">
                    {t.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="hidden w-[160px] flex-none items-center justify-center border-l border-[#FFF7EA]/8 sm:flex"
        style={{ background: "rgba(255,90,71,.12)" }}
      >
        <span className="inline-flex items-center gap-2 text-[12.5px] font-bold text-primary">
          Ouvrir le brief →
        </span>
      </div>
    </div>
  );
}

const PLACEHOLDER = [
  { title: "Génère le brief pour voir les 3 signaux du jour", why: "" },
  { title: "L'IA résume le flux en tendances actionnables", why: "" },
  { title: "Clique pour ouvrir le brief complet", why: "" },
];
