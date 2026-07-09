"use client";

// Overlay "Radar scanne le web" — joué pendant l'ajout d'une source (collecte du flux).
export function ScanOverlay({ label = "Radar scanne le web pour vous…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm">
      <div className="relative h-[176px] w-[176px]">
        <div className="absolute inset-0 rounded-full border border-primary/25" />
        <div className="absolute inset-[28px] rounded-full border border-primary/20" />
        <div className="absolute inset-[56px] rounded-full border border-primary/15" />
        {/* balayage */}
        <div
          className="absolute inset-0 animate-spin rounded-full"
          style={{
            animationDuration: "1.4s",
            background:
              "conic-gradient(from 0deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.05) 55deg, transparent 90deg)",
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
      </div>
      <div className="mt-8 text-[15px] font-semibold text-foreground">{label}</div>
      <div className="mt-1.5 text-[12.5px] text-foreground/50">Collecte des derniers articles…</div>
    </div>
  );
}
