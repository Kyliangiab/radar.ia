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
 * Couleurs dérivées de la palette (FAF3E3 · FFB200 · E35C2B · 180700) —
 * 4 tons chauds distincts, lisibles sur fond cream.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    id: "all",
    label: "Tout",
    color: "#E35C2B",
    gradient: true,
    hnFrontPage: true,
    devtoTags: [],
  },
  {
    id: "tech",
    label: "Tech",
    color: "#E35C2B", // terracotta
    hnQuery: "technology",
    devtoTags: ["technology", "hardware"],
  },
  {
    id: "biz",
    label: "Business",
    color: "#FFB200", // ambre
    hnQuery: "startup",
    devtoTags: ["startup", "career"],
  },
  {
    id: "data",
    label: "Data & IA",
    color: "#8A2E12", // cocoa-red profond
    hnQuery: "AI",
    devtoTags: ["ai", "machinelearning"],
  },
  {
    id: "ux",
    label: "UX & Design",
    color: "#C98A3C", // ochre chaud
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
export const RAMP = "linear-gradient(90deg,#8A2E12,#E35C2B,#FFB200,#FAF3E3)";
