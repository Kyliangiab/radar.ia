"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

/** Écran de connexion — Google OAuth via Supabase Auth (vrai, pas de démo). */
export function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    // En cas de succès, le navigateur part vers Google : pas de retour ici.
    if (error) {
      setError("La connexion a échoué. Réessaie.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
      {/* halo corail discret */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: "hsl(var(--primary) / 0.35)" }}
      />
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-[400px]">
        {/* Marque */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7)]">
            <Logo size={56} />
          </span>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">
            Bon retour sur {BRAND.name}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-foreground/55">
            Votre veille tech, résumée et priorisée par l'IA.
          </p>
        </div>

        {/* Carte */}
        <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_16px_40px_-20px_rgba(0,0,0,.25)]">
          <button
            onClick={signIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continuer avec Google
          </button>

          {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}
        </div>

        <p className="mx-auto mt-6 max-w-[320px] text-center text-[11px] leading-relaxed text-foreground/40">
          En continuant, vous acceptez les conditions d'utilisation de {BRAND.name} et notre
          politique de confidentialité.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
