import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur (service role → bypass RLS).
 * Utilisé par les routes API et le script d'ingestion, jamais exposé au client.
 * Renvoie null si les variables d'env manquent (l'app bascule alors en mode
 * "live fetch" dégradé, sans base).
 */
let _client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return _client;
}

export function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
