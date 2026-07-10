"use client";

import { Loader2 } from "lucide-react";
import type { Briefing } from "@/lib/types";

const HL_COLORS = ["#C8663A", "#4E8D6E", "#8E5FB8", "#B4568F"];

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
      className="group mb-[30px] flex cursor-pointer items-stretch overflow-hidden rounded-[16px] border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-14px_rgba(26,10,8,.18)]"
      style={{ borderLeft: "4px solid #FF5A47" }}
    >
      <div className="min-w-0 flex-1 p-[22px_26px]">
        <div className="mb-[9px] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#E0503F]">
          Le brief du jour · auto-généré
        </div>
        <div className="mb-[5px] text-[20px] font-bold leading-[1.2] text-foreground">
          {briefing?.headline || "Ce qui ressort du flux aujourd'hui"}
        </div>
        <div className="mb-[18px] text-[12.5px] text-foreground/50">
          {trends.length || 3} signaux · {analyzed} articles analysés depuis hier
        </div>

        {loading && !briefing ? (
          <div className="flex items-center gap-2 text-[12.5px] text-foreground/50">
            <Loader2 size={15} className="animate-spin text-primary" /> Analyse du flux par l'IA…
          </div>
        ) : (
          <div className="flex flex-wrap gap-[26px]">
            {(trends.length ? trends : PLACEHOLDER).map((t, i) => (
              <div key={i} className="flex max-w-[220px] gap-[10px]">
                <div
                  className="shrink-0 text-[17px] font-bold leading-[1.1]"
                  style={{ color: HL_COLORS[i % HL_COLORS.length] }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 text-[12.5px] font-semibold leading-[1.3] text-foreground">
                  {t.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden w-[158px] flex-none items-center justify-center border-l border-border bg-primary/[0.07] sm:flex">
        <span className="text-[13px] font-semibold text-hot">Ouvrir le brief →</span>
      </div>
    </div>
  );
}

const PLACEHOLDER = [
  { title: "Génère le brief pour voir les 3 signaux du jour", why: "" },
  { title: "L'IA résume le flux en tendances actionnables", why: "" },
  { title: "Clique pour ouvrir le brief complet", why: "" },
];
