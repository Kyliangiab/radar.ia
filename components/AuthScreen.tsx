"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { editionInfo } from "@/lib/edition";
import { Logo } from "./Logo";

type Mode = "login" | "register";
type Busy = null | "google" | "email" | "magic";

/**
 * Écran de connexion / création de compte (design "Radar Login", 2 panneaux).
 * Google OAuth + email/mot de passe + lien magique + mot de passe oublié,
 * tout via Supabase Auth. Le panneau éditorial (gauche) est masqué en mobile.
 */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [edition, setEdition] = useState("");

  useEffect(() => setEdition(editionInfo().label), []);

  const isRegister = mode === "register";
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function google() {
    const sb = getSupabaseBrowser();
    if (!sb) return setError("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
    setError(null);
    setInfo(null);
    setBusy("google");
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin } });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
    // Succès → redirection vers Google, pas de retour ici.
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowser();
    if (!sb) return setError("Supabase n'est pas configuré.");
    if (!email || !password) return setError("Email et mot de passe requis.");
    setError(null);
    setInfo(null);
    setBusy("email");
    if (isRegister) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: firstName || undefined }, emailRedirectTo: origin },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo("Compte créé — vérifie tes emails pour confirmer ton adresse.");
      // Si la confirmation e-mail est désactivée, la session arrive et l'app se charge.
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : error.message);
    }
    setBusy(null);
  }

  async function magicLink() {
    const sb = getSupabaseBrowser();
    if (!sb) return setError("Supabase n'est pas configuré.");
    if (!email) return setError("Entre ton email d'abord.");
    setError(null);
    setInfo(null);
    setBusy("magic");
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: origin } });
    if (error) setError(error.message);
    else setInfo("Lien magique envoyé — regarde tes emails.");
    setBusy(null);
  }

  async function forgot() {
    const sb = getSupabaseBrowser();
    if (!sb) return setError("Supabase n'est pas configuré.");
    if (!email) return setError("Entre ton email d'abord, puis reclique sur « Oublié ? ».");
    setError(null);
    setInfo(null);
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: origin });
    if (error) setError(error.message);
    else setInfo("Email de réinitialisation envoyé.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EFE5D2] p-4 sm:p-6 font-sans">
      <div className="flex w-full max-w-[1040px] overflow-hidden rounded-[20px] bg-[#FFF7EA] shadow-[0_30px_80px_-30px_rgba(26,10,8,.35)]">
        {/* ── Panneau éditorial (gauche) ── */}
        <div className="relative hidden w-[460px] flex-none flex-col overflow-hidden bg-[#1A0A08] p-[44px_44px_38px] text-[#FFF7EA] lg:flex">
          <div className="pointer-events-none absolute -right-24 -top-24 h-[400px] w-[400px] rounded-full" style={{ background: "radial-gradient(circle,rgba(255,90,71,.14),transparent 65%)" }} />

          <div className="relative flex items-center gap-3">
            <Logo size={38} />
            <div>
              <div className="text-[18px] font-bold leading-none tracking-[-0.012em]">{BRAND.name}</div>
              <div className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#FFF7EA]/55">
                {edition}
              </div>
            </div>
          </div>

          <div className="relative mt-auto">
            <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-2 w-2 animate-pulseDot rounded-full bg-primary" />
              Ce matin dans le brief
            </div>

            <h1 className="mb-6 text-[46px] font-bold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
              {"Les modèles < 3 B rattrapent GPT-4."}
            </h1>

            <p className="mb-8 max-w-[420px] text-[15px] leading-[1.55] text-[#FFF7EA]/[0.66]">
              Sur 12 benchmarks, les petits modèles fine-tunés talonnent — à coût d'inférence divisé
              par 40. Deux autres signaux t'attendent dans ton brief.
            </p>

            <div className="flex gap-4 rounded-[14px] border border-[#FFF7EA]/[0.12] bg-[#FFF7EA]/[0.05] p-[16px_18px]">
              {[
                { n: "01", label: "Data / IA", color: "#8E5FB8" },
                { n: "02", label: "Tech", color: "#C8663A" },
                { n: "03", label: "Business", color: "#4E8D6E" },
              ].map((s) => (
                <div key={s.n} className="flex flex-1 items-center gap-2">
                  <div className="text-[22px] font-bold leading-none tracking-[-0.03em]" style={{ color: s.color }}>
                    {s.n}
                  </div>
                  <div className="font-mono text-[8.5px] font-bold uppercase leading-tight tracking-[0.1em] text-[#FFF7EA]/55">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-9 flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FFF7EA]/40">
            <span>247 articles analysés depuis hier</span>
            <span>Fait à Paris</span>
          </div>
        </div>

        {/* ── Formulaire (droite) ── */}
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-[72px]">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {isRegister ? "Créer un compte" : "Se connecter"}
            </div>

            <h2 className="mb-3 text-[40px] font-bold leading-none tracking-[-0.028em] text-[#1A0A08]">
              {isRegister ? "Ouvre ton Radar." : "Bienvenue."}
            </h2>
            <p className="mb-6 text-[14.5px] leading-[1.5] text-[#1A0A08]/[0.62]">
              {isRegister
                ? "Reçois ton premier brief demain matin à 06:00."
                : "Ton brief t'attend depuis 06:00. Deux minutes de lecture."}
            </p>

            {/* Segment login / register */}
            <div className="mb-5 flex gap-[3px] rounded-full bg-[#1A0A08]/[0.06] p-[3px]">
              {(["login", "register"] as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={
                      "flex-1 rounded-full px-4 py-2.5 text-[12.5px] transition-all " +
                      (active
                        ? "bg-white font-bold text-[#1A0A08] shadow-[0_1px_2px_rgba(26,10,8,.12)]"
                        : "font-semibold text-[#1A0A08]/55 hover:text-[#1A0A08]")
                    }
                  >
                    {m === "login" ? "Se connecter" : "Créer un compte"}
                  </button>
                );
              })}
            </div>

            {/* Google */}
            <button
              onClick={google}
              disabled={busy === "google"}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-[#1A0A08]/[0.14] bg-white px-5 py-[13px] text-[13.5px] font-semibold text-[#1A0A08] transition-colors hover:bg-[#1A0A08]/[0.03] disabled:opacity-60"
            >
              {busy === "google" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span
                  className="inline-block h-[18px] w-[18px] rounded-full"
                  style={{
                    background:
                      "conic-gradient(from -45deg,#4285F4 0deg 90deg,#34A853 90deg 180deg,#FBBC04 180deg 270deg,#EA4335 270deg 360deg)",
                  }}
                />
              )}
              Continuer avec Google
            </button>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3.5">
              <div className="h-px flex-1 bg-[#1A0A08]/[0.12]" />
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#1A0A08]/[0.42]">
                ou par email
              </span>
              <div className="h-px flex-1 bg-[#1A0A08]/[0.12]" />
            </div>

            {/* Formulaire email */}
            <form onSubmit={submitEmail} className="flex flex-col gap-2.5">
              {isRegister && (
                <Field label="Prénom">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    type="text"
                    placeholder="Kylian"
                    className={inputCls}
                  />
                </Field>
              )}
              <Field label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="kylian@exemple.com"
                  className={inputCls}
                />
              </Field>
              <Field
                label="Mot de passe"
                right={
                  isRegister ? (
                    <span className="text-[11px] font-medium text-[#1A0A08]/[0.42]">8 caractères min.</span>
                  ) : (
                    <button type="button" onClick={forgot} className="text-[11px] font-medium text-[#1A0A08]/55 hover:text-[#1A0A08]">
                      Oublié ?
                    </button>
                  )
                }
              >
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className={inputCls}
                />
              </Field>

              {error && <p className="text-[12px] font-medium text-[#E0503F]">{error}</p>}
              {info && <p className="text-[12px] font-medium text-[#4E8D6E]">{info}</p>}

              <button
                type="submit"
                disabled={busy === "email"}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-[15px] text-[14px] font-bold text-[#FFF7EA] shadow-[0_12px_28px_-12px_rgba(255,90,71,.55)] transition-transform hover:-translate-y-px disabled:opacity-60"
              >
                {busy === "email" && <Loader2 size={16} className="animate-spin" />}
                {isRegister ? "Créer mon Radar →" : "Ouvrir mon Radar →"}
              </button>
            </form>

            {/* Lien magique */}
            <div className="mt-4 text-center">
              <button
                onClick={magicLink}
                disabled={busy === "magic"}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-semibold text-[#1A0A08] transition-colors hover:bg-[#1A0A08]/[0.04] disabled:opacity-60"
              >
                {busy === "magic" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-[#4E8D6E]" />
                )}
                Recevoir un lien magique par email
              </button>
            </div>

            {/* Swap */}
            <div className="mt-6 border-t border-[#1A0A08]/[0.1] pt-5 text-center text-[13px] text-[#1A0A08]/60">
              {isRegister ? (
                <>
                  Déjà un compte ?{" "}
                  <button onClick={() => switchMode("login")} className="font-bold text-primary">
                    Se connecter →
                  </button>
                </>
              ) : (
                <>
                  Nouveau ici ?{" "}
                  <button onClick={() => switchMode("register")} className="font-bold text-primary">
                    Créer un compte gratuit →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-full border border-[#1A0A08]/[0.14] bg-white px-[18px] py-[13px] text-[14px] text-[#1A0A08] outline-none transition-colors placeholder:text-[#1A0A08]/40 focus:border-primary";

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#1A0A08]/50">
          {label}
        </span>
        {right}
      </div>
      {children}
    </label>
  );
}
