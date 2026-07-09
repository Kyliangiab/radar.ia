export function SignalBars({ heat }: { heat: number }) {
  // 5 barres, allumées selon le heat 0..100
  const lit = Math.max(1, Math.round((heat / 100) * 5));
  const hot = heat >= 70;
  return (
    <span
      className="inline-flex h-4 items-end gap-[3px]"
      title={`Signal ${heat}/100`}
      aria-label={`Force du signal ${heat} sur 100`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const on = i < lit;
        return (
          <span
            key={i}
            className="w-[3px] rounded-full transition-all"
            style={{
              height: `${5 + i * 2.6}px`,
              background: on
                ? hot
                  ? "hsl(var(--hot))"
                  : "hsl(var(--brand))"
                : "hsl(var(--border))",
              opacity: on ? 1 : 0.7,
            }}
          />
        );
      })}
    </span>
  );
}
