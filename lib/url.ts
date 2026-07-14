/**
 * Normalisation d'URL — clé de dédoublonnage et d'upsert (règle dure #5, T4).
 *
 * Le bug d'écrasement (34 updates parasites, run 2026-07-14) venait d'un même
 * article recollecté avec une URL de tracking différente (utm_*, fbclid…) :
 * « nouveau par URL » mais même `id` → écrasement via `onConflict:"id"`.
 * On dédoublonne et on upsert désormais sur cette forme canonique, jamais sur
 * `id`.
 *
 * Retire : host en minuscules, fragment `#…`, params de tracking (`utm_*`,
 * `fbclid`, `ref`), slash(es) de fin de chemin. Conserve les autres params
 * significatifs (ex. `?p=123`).
 */

// Un paramètre de requête est-il du tracking à retirer ?
function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase();
  return k.startsWith("utm_") || k === "fbclid" || k === "ref";
}

export function canonicalUrl(raw: string): string {
  const input = (raw ?? "").trim();
  try {
    const u = new URL(input);
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase();
    u.hash = "";

    for (const key of Array.from(u.searchParams.keys())) {
      if (isTrackingParam(key)) u.searchParams.delete(key);
    }

    // Chemin sans slash(es) de fin ; racine → chaîne vide (host seul).
    const path = u.pathname.replace(/\/+$/, "");
    const search = u.searchParams.toString();
    return `${u.protocol}//${u.host}${path}${search ? `?${search}` : ""}`;
  } catch {
    // Entrée non-URL absolue : normalisation best-effort, sans crash.
    return input
      .replace(/#.*$/, "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}
