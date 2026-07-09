// Pastille de pertinence dérivée du `heat` (0..100) de l'article.
// Niveaux du design 2a : Faible (neutre) · Moyen (olive) · Haute (vert) · On Fire (corail-rouge).
export interface RelevanceMeta {
  label: string;
  color: string;
  bg: string;
}

export function relevanceMeta(score: number): RelevanceMeta {
  if (score >= 90) return { label: "On Fire", color: "#E0503F", bg: "rgba(255,107,106,.18)" };
  if (score >= 80) return { label: "Haute", color: "#3F7A5E", bg: "rgba(78,141,110,.16)" };
  if (score >= 68) return { label: "Moyen", color: "#8A7A3F", bg: "rgba(138,122,63,.16)" };
  // Faible : couleur theme-aware (la version codée en dur était illisible en dark).
  return {
    label: "Faible",
    color: "hsl(var(--foreground) / 0.5)",
    bg: "hsl(var(--foreground) / 0.07)",
  };
}
