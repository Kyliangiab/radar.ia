import type { CategoryId } from "./types";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  color: string; // hex — pastille (palette Marple)
  gradient?: boolean; // "Tout" = pastille dégradée
  devtoTags: string[];
}

/**
 * Les 4 domaines imposés par le brief :
 * Tech · Business de la tech · Data & IA · UX & solutions numériques.
 * Couleurs = thèmes du design 2a (pastilles, tags, numéros) :
 * Tech #C8663A · Business #4E8D6E · Data & IA #5566C7 · UX & Design #B4568F.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    id: "all",
    label: "Tout",
    color: "#FF6B6A",
    gradient: true,
    devtoTags: [],
  },
  {
    id: "tech",
    label: "Tech",
    color: "#C8663A", // terracotta
    devtoTags: ["technology", "hardware"],
  },
  {
    id: "biz",
    label: "Business",
    color: "#4E8D6E", // vert
    devtoTags: ["startup", "career"],
  },
  {
    id: "data",
    label: "Data & IA",
    color: "#5566C7", // indigo
    devtoTags: ["ai", "machinelearning"],
  },
  {
    id: "ux",
    label: "UX & Design",
    color: "#B4568F", // magenta
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
export const RAMP = "linear-gradient(90deg,#C8663A,#4E8D6E,#5566C7,#B4568F)";
