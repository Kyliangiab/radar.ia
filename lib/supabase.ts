import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur (service role → bypass RLS).
 * Utilisé par les routes API et le script d'ingestion, jamais exposé au client.
 * Renvoie null si les variables d'env manquent (l'app bascule alors en mode
 * "live fetch" dégradé, sans base).
 */
let _client: SupabaseClient | null | undefined;

// Next.js met en cache le `fetch` sous-jacent (Data Cache disque) → les
// lectures serveur servaient des comptes/données PÉRIMÉS (bug d'honnêteté T10 :
// /api/stats renvoyait un vieux articleCount). On contrôle donc explicitement la
// politique de cache du fetch supabase-js :
//  · getSupabase()    → `no-store` : routes API toujours à jour (défaut).
//  · getSupabaseISR() → `next.revalidate` : pages ISR (landing) régénérées
//    périodiquement au lieu d'un hit DB par visite.
// (Sans effet côté CLI : node ignore ces options.)
function cachedFetch(policy: "no-store" | number) {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    fetch(input, {
      ...init,
      ...(policy === "no-store" ? { cache: "no-store" } : { next: { revalidate: policy } }),
    });
}

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false },
          global: { fetch: cachedFetch("no-store") },
        })
      : null;
  return _client;
}

// Client dédié aux pages ISR : les lectures sont mises en cache `revalidate` s
// (défaut 600 = 10 min). Utilisé par la landing publique (compteurs qui bougent
// au rythme du cron 6 h → pas besoin d'un hit DB par visite).
const _isrClients = new Map<number, SupabaseClient>();
export function getSupabaseISR(revalidate = 600): SupabaseClient | null {
  const cached = _isrClients.get(revalidate);
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: cachedFetch(revalidate) },
  });
  _isrClients.set(revalidate, client);
  return client;
}

export function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
