"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

export interface AuthUser {
  name: string;
  email: string;
  initials: string;
  plan: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "R";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AuthScreen({ onAuth }: { onAuth: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(via: "email" | "google") {
    setError(null);
    const finalEmail = via === "google" ? "kylian@gmail.com" : email.trim();
    if (via === "email") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(finalEmail)) {
        return setError("Entre une adresse e-mail valide.");
      }
      if (mode === "signup" && !name.trim()) {
        return setError("Indique ton nom pour créer le compte.");
      }
    }
    setLoading(true);
    // Auth "démo" (client) — à brancher sur Supabase Auth pour du réel.
    const finalName =
      via === "google"
        ? "Kylian Giabiconi"
        : mode === "signup"
          ? name.trim()
          : finalEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setTimeout(() => {
      onAuth({
        name: finalName,
        email: finalEmail,
        initials: initialsOf(finalName),
        plan: mode === "signup" ? "Nouveau · Plan Free" : "Plan Max",
      });
    }, 500);
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
            {mode === "login" ? "Bon retour sur Radar" : "Créez votre compte Radar"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-foreground/55">
            {mode === "login"
              ? "Votre veille tech, résumée et priorisée par l'IA."
              : "Quelques secondes, et le flux s'auto-alimente pour vous."}
          </p>
        </div>

        {/* Carte */}
        <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_16px_40px_-20px_rgba(0,0,0,.25)]">
          <button
            onClick={() => submit("google")}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <GoogleIcon /> Continuer avec Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-foreground/35">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2.5">
            {mode === "signup" && (
              <Field
                label="Nom"
                value={name}
                onChange={setName}
                placeholder="Kylian Giabiconi"
                type="text"
                onEnter={() => submit("email")}
              />
            )}
            <Field
              label="Adresse e-mail"
              value={email}
              onChange={setEmail}
              placeholder="vous@exemple.com"
              type="email"
              onEnter={() => submit("email")}
            />
          </div>

          {error && <p className="mt-2.5 text-[12px] text-destructive">{error}</p>}

          <button
            onClick={() => submit("email")}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Se connecter" : "Créer mon compte"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Bascule mode */}
        <p className="mt-5 text-center text-[13px] text-foreground/55">
          {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "login" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>

        <p className="mx-auto mt-6 max-w-[320px] text-center text-[11px] leading-relaxed text-foreground/40">
          En continuant, vous acceptez les conditions d'utilisation de {BRAND.name} et notre
          politique de confidentialité.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  onEnter: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-foreground/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
    </label>
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
