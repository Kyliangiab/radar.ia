// Petit surnom fun affiché sous le nom (à la place d'un "plan").
// Assigné à la connexion et persisté avec l'utilisateur.
export const PERSONAS = [
  "L'explorateur",
  "Le chien fou",
  "La vigie",
  "L'éclaireur",
  "Le flair infaillible",
  "Le limier",
  "La sentinelle",
  "Le fouineur",
  "Le curieux",
  "Le veilleur de nuit",
  "Le franc-tireur",
  "L'antenne",
  "Le radar ambulant",
  "Le noctambule",
  "Le glaneur",
  "Le futé",
  "La tête chercheuse",
  "Le grand fouineur",
  "L'oreille absolue",
  "Le renard des flux",
];

export function randomPersona(): string {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
}

// Vrai si l'étiquette ressemble à un ancien "plan" (à migrer vers un persona).
export function isLegacyPlan(label: string | undefined): boolean {
  return !label || /plan|nouveau/i.test(label);
}
