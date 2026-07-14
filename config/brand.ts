/**
 * ─────────────────────────────────────────────
 *  MARQUE — édite ce fichier pour l'adapter à ton brand.
 *  (nom, baseline, accents couleur = voir app/globals.css : --accent / --hot)
 * ─────────────────────────────────────────────
 */
export const BRAND = {
  name: "Radar",
  baseline: "Veille tech, UI & IA",
  // Petite phrase affichée sous le titre du briefing
  intro: "Le signal du jour, filtré. Ce qui bouge en tech, design et IA — sans le bruit.",
  // Nom affiché dans le pied de page
  maker: "Master Project",
  year: new Date().getFullYear(),
};

// NB : le compte affiché (sidebar + hero) vient de la SESSION Supabase réelle
// (cf. app/app/page.tsx), pas d'un objet en dur. L'ancien export `USER`
// (nom réel + "Plan Max") était du code mort trompeur → supprimé (T10).
