export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full border border-line bg-panel2 overflow-hidden shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* cercles concentriques */}
      <span className="absolute inset-1 rounded-full border border-line/70" />
      <span className="absolute inset-[9px] rounded-full border border-line/50" />
      {/* balayage radar */}
      <span
        className="absolute inset-0 animate-sweep"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgb(var(--accent) / 0.55) 355deg, transparent 360deg)",
        }}
      />
      {/* point central */}
      <span className="absolute h-1 w-1 rounded-full bg-accent shadow-glow" />
    </span>
  );
}
