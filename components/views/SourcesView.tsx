"use client";

import { useState } from "react";
import { SOURCES, FREQUENCIES } from "@/lib/sourcesConfig";
import { categoryColor } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function SourcesView() {
  const [freq, setFreq] = useState("Toutes les heures");
  const [sources, setSources] = useState(SOURCES.map((s) => ({ ...s })));

  return (
    <div className="max-w-[800px]">
      <div className="mb-1 text-[22px] font-bold text-foreground">Sources &amp; configuration</div>
      <div className="mb-6 text-[13px] text-foreground/55">
        Radar interroge ces sources en continu, dédoublonne et résume automatiquement.
      </div>

      {/* Fréquence */}
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
        Fréquence de collecte
      </div>
      <div className="mb-7 flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => {
          const active = freq === f;
          return (
            <button
              key={f}
              onClick={() => setFreq(f)}
              className={cn(
                "rounded-[22px] border px-[15px] py-[9px] text-[12.5px] font-medium transition-colors",
                active
                  ? "border-transparent bg-foreground text-background"
                  : "border-border bg-card text-foreground/60 hover:text-foreground",
              )}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
        Sources surveillées
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {sources.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-[14px_16px]"
          >
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ background: categoryColor(s.category) }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-foreground">{s.name}</div>
              <div className="truncate text-[11.5px] text-foreground/45">{s.type}</div>
            </div>
            <button
              onClick={() =>
                setSources((prev) =>
                  prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
                )
              }
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[16px] border px-3 py-[5px] text-[11.5px] font-medium transition-colors",
                !s.active && "border-border bg-transparent text-foreground/50",
              )}
              style={
                s.active
                  ? { borderColor: "#4E8D6E", background: "rgba(78,141,110,.12)", color: "#4E8D6E" }
                  : undefined
              }
            >
              {s.active ? "Actif" : "En pause"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
