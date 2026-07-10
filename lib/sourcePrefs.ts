"use client";

import { getSupabaseBrowser } from "./supabaseBrowser";

/**
 * Préférences PAR UTILISATEUR sur les sources (table user_source_prefs, RLS).
 * Permet de mettre en pause / retirer une source de SON fil sans toucher la
 * config partagée (`sources`). Persiste au rechargement.
 */
export type SourcePref = {
  source_id: string;
  paused: boolean;
  removed: boolean;
  updated_at: string;
};

export async function listSourcePrefs(): Promise<SourcePref[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data } = await sb
    .from("user_source_prefs")
    .select("source_id,paused,removed,updated_at");
  return (data ?? []) as SourcePref[];
}

/**
 * Purge définitive d'une source PERSO archivée depuis > 72 h : supprime la
 * ligne user_sources ET sa préférence. (Les sources globales ne sont pas dans
 * user_sources — rien à supprimer côté DB, la préférence "removed" suffit.)
 */
export async function purgeArchivedSource(userId: string, sourceId: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.from("user_sources").delete().eq("id", sourceId);
  await sb.from("user_source_prefs").delete().eq("user_id", userId).eq("source_id", sourceId);
}

/** Upsert partiel : ne touche que les colonnes fournies (paused OU removed). */
export async function setSourcePref(
  userId: string,
  sourceId: string,
  patch: { paused?: boolean; removed?: boolean },
): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.from("user_source_prefs").upsert(
    { user_id: userId, source_id: sourceId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "user_id,source_id" },
  );
}
