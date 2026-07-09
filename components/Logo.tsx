export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* cercles concentriques */}
      <span className="absolute inset-1 rounded-full border border-border/70" />
      <span className="absolute inset-[9px] rounded-full border border-border/50" />
      {/* balayage radar */}
      <span
        className="absolute inset-0 animate-sweep"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, hsl(var(--brand) / 0.6) 355deg, transparent 360deg)",
        }}
      />
      {/* point central */}
      <span className="absolute h-1 w-1 rounded-full bg-primary shadow-glow" />
    </span>
  );
}
