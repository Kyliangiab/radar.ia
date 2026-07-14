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
// /api/stats renvoyait un vieux articleCount). On force `no-store` : les routes
// API et pages serveur voient toujours la base à jour. (Sans effet côté CLI.)
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: "no-store" });
}

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false },
          global: { fetch: noStoreFetch },
        })
      : null;
  return _client;
}

export function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
