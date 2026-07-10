"use client";

import { useEffect } from "react";

/**
 * Garde-fou global (App Router). Sans lui, la moindre exception de rendu
 * affiche une page blanche. Ici on montre un message lisible + l'erreur
 * (utile pour diagnostiquer) et un bouton pour relancer le segment.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible dans la console navigateur ET dans les logs runtime Vercel.
    console.error("[Radar] Erreur de rendu :", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-[440px] rounded-[16px] border border-border bg-card p-7 text-center">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-[20px] text-primary">
          !
        </div>
        <h1 className="mb-1.5 text-[18px] font-bold text-foreground">Un souci est survenu</h1>
        <p className="mb-4 text-[13px] leading-[1.5] text-foreground/60">
          Radar a rencontré une erreur inattendue. Tu peux réessayer — tes données ne sont pas
          perdues.
        </p>
        {(error?.message || error?.digest) && (
          <pre className="mb-4 max-h-40 overflow-auto rounded-[10px] bg-foreground/[0.05] p-3 text-left font-mono text-[11px] leading-[1.4] text-foreground/70">
            {error.message}
            {error.digest ? `\n(digest: ${error.digest})` : ""}
          </pre>
        )}
        <button
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
