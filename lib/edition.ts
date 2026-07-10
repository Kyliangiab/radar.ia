/**
 * Libellé d'édition daté du produit (sidebar, en-têtes, tendances).
 * Le Nº incrémente d'une unité par jour depuis le lancement → vrai numéro
 * d'édition, plus de "187" codé en dur.
 *
 * À appeler côté client (dans un useEffect) pour éviter le mismatch
 * d'hydratation SSR/CSR (la date serveur ≠ date client).
 */
const EPOCH_UTC = Date.UTC(2026, 0, 4); // Nº 1 = 4 janvier 2026

export type EditionInfo = { date: string; number: number; label: string };

export function editionInfo(d: Date = new Date()): EditionInfo {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dayUTC = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const number = Math.max(1, Math.floor((dayUTC - EPOCH_UTC) / 86_400_000) + 1);
  return { date: `${dd}.${mm}`, number, label: `Éd. ${dd}.${mm} · Nº ${number}` };
}
