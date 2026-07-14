/**
 * Libellé d'édition daté du produit (sidebar, en-têtes, tendances).
 * Le Nº = nombre de JOURS D'INGESTION RÉELS (jours distincts avec au moins un
 * run de collecte, cf. /api/stats `ingestDays`). Plus de numéro dérivé de la
 * date : tant qu'on ne connaît pas `ingestDays`, on n'affiche pas de Nº (jamais
 * de "187" inventé). Règle #8 (UI honnête, T10).
 *
 * À appeler côté client (dans un useEffect) pour éviter le mismatch
 * d'hydratation SSR/CSR (la date serveur ≠ date client).
 */
export type EditionInfo = { date: string; number: number | null; label: string };

export function editionInfo(d: Date = new Date(), ingestDays?: number | null): EditionInfo {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const date = `${dd}.${mm}`;
  // Nº seulement si on a un vrai compte de jours d'ingestion (≥ 1).
  const number = typeof ingestDays === "number" && ingestDays >= 1 ? ingestDays : null;
  const label = number ? `Éd. ${date} · Nº ${number}` : `Éd. ${date}`;
  return { date, number, label };
}
