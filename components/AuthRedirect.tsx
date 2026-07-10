"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

/**
 * Îlot client greffé sur la landing (serveur) : si l'utilisateur est déjà
 * connecté, on l'envoie direct sur /app (il n'a pas besoin de la page
 * marketing). Les visiteurs non connectés voient la landing normalement.
 */
export function AuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/app");
    });
  }, [router]);
  return null;
}
