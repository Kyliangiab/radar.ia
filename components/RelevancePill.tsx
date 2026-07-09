import { relevanceMeta } from "@/lib/relevance";

export function RelevancePill({ score, className }: { score: number; className?: string }) {
  const m = relevanceMeta(score);
  return (
    <span
      className={className}
      style={{
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: ".02em",
        padding: "3px 10px",
        borderRadius: "20px",
        whiteSpace: "nowrap",
        background: m.bg,
        color: m.color,
      }}
    >
      {m.label}
    </span>
  );
}
