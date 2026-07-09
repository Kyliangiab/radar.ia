// Logo Radar — disque noir avec balayage radar qui tourne (animate-sweep).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* cercles concentriques */}
      <span className="absolute inset-[3px] rounded-full border border-white/25" />
      <span className="absolute inset-[8px] rounded-full border border-white/15" />
      {/* balayage radar (corail) */}
      <span
        className="absolute inset-0 animate-sweep"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, hsl(var(--primary) / 0.75) 355deg, transparent 360deg)",
        }}
      />
      {/* point central */}
      <span className="absolute h-[3px] w-[3px] rounded-full bg-primary shadow-glow" />
    </span>
  );
}
