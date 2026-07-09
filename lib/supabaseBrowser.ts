"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté navigateur (clé anon publique).
 * Porte la session de l'utilisateur connecté (Google OAuth) → les requêtes
 * `saved` sont scoped par RLS via auth.uid(). Aucune clé service ici.
 *
 * Renvoie null si les variables NEXT_PUBLIC_* manquent : l'app affiche alors un
 * message de config au lieu de crasher.
 */
let _client: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  _client = url && key ? createClient(url, key) : null;
  return _client;
}
