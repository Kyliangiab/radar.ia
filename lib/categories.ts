import type { CategoryId } from "./types";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  color: string; // hex — pastille (palette Marple)
  gradient?: boolean; // "Tout" = pastille dégradée
  hnQuery?: string;
  hnFrontPage?: boolean;
  devtoTags: string[];
}

/**
 * Les 4 domaines imposés par le brief :
 * Tech · Business de la tech · Data & IA · UX & solutions numériques.
 * Couleurs = palette Marple (CA2851 · FF6766 · FFB173 · FFE3B3).
 */
export const CATEGORIES: CategoryDef[] = [
  {
    id: "all",
    label: "Tout",
    color: "#FF6766",
    gradient: true,
    hnFrontPage: true,
    devtoTags: [],
  },
  {
    id: "tech",
    label: "Tech",
    color: "#CA2851",
    hnQuery: "technology",
    devtoTags: ["technology", "hardware"],
  },
  {
    id: "biz",
    label: "Business",
    color: "#FF6766",
    hnQuery: "startup",
    devtoTags: ["startup", "career"],
  },
  {
    id: "data",
    label: "Data & IA",
    color: "#FFB173",
    hnQuery: "AI",
    devtoTags: ["ai", "machinelearning"],
  },
  {
    id: "ux",
    label: "UX & Design",
    color: "#FFE3B3",
    hnQuery: "design",
    devtoTags: ["design", "ux"],
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryDef> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, CategoryDef>,
);

export function categoryColor(id: CategoryId): string {
  return CATEGORY_MAP[id]?.color ?? "#FF6766";
}

// Dégradé signature (barre briefing, pastille "Tout")
export const RAMP = "linear-gradient(90deg,#CA2851,#FF6766,#FFB173,#FFE3B3)";
