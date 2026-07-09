"use client";

import { getSupabaseBrowser } from "./supabaseBrowser";

/**
 * Favoris persistés en base (table `saved`, RLS par auth.uid()).
 * Le client navigateur porte la session : pas besoin de passer le user_id,
 * `default auth.uid()`… non — on le fournit à l'insert, RLS vérifie l'égalité.
 */

export async function listSaved(): Promise<Set<string>> {
  const sb = getSupabaseBrowser();
  if (!sb) return new Set();
  const { data, error } = await sb.from("saved").select("article_id");
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.article_id as string));
}

export async function addSaved(userId: string, articleId: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.from("saved").insert({ user_id: userId, article_id: articleId });
}

export async function removeSaved(articleId: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.from("saved").delete().eq("article_id", articleId);
}
