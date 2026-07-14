import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Garde-fous partagés des routes API (T9). Objectif : ne pas laisser brûler la
 * clé LLM centralisée (ADR-0002) par des routes ouvertes.
 */

/**
 * Exige une session valide : lit le Bearer, le valide via Supabase Auth.
 * Renvoie `{ user }` si OK, sinon une `NextResponse` 401 à retourner telle
 * quelle. Même mécanique que POST /api/sources.
 */
export async function requireUser(
  request: Request,
  supabase: SupabaseClient,
): Promise<{ user: User } | NextResponse> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return { user };
}

/** IP client (derrière le proxy Vercel). Best-effort, sert de clé de rate limit. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Rate limit simple en mémoire (fenêtre glissante), sans dépendance.
 * ⚠️ Portée = instance : en serverless (Vercel) plusieurs instances coexistent,
 * donc best-effort — pas une limite globale stricte. Suffisant en J0 pour
 * casser l'abus trivial ; un vrai quota (Redis/Upstash) viendra avec les plans.
 * Renvoie true si la requête est autorisée, false si la limite est dépassée.
 */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const cutoff = now - windowMs;
  const arr = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
