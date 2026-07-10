"use client";

import { getSupabaseBrowser } from "./supabaseBrowser";

/**
 * Articles lus persistés en base (table `article_reads`, RLS par auth.uid()).
 * Même patron que `saved` — l'état "lu" (grisé) survit au rechargement.
 */

export async function listReads(): Promise<Set<string>> {
  const sb = getSupabaseBrowser();
  if (!sb) return new Set();
  const { data, error } = await sb.from("article_reads").select("article_id");
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.article_id as string));
}

export async function addRead(userId: string, articleId: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  // Idempotent : ne casse pas si l'article est déjà marqué lu.
  await sb
    .from("article_reads")
    .upsert({ user_id: userId, article_id: articleId }, { onConflict: "user_id,article_id" });
}
