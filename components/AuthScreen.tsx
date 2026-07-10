"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { editionInfo } from "@/lib/edition";
import { fetchStats, type StatsResp } from "@/lib/stats";

type Mode = "login" | "register";
type Busy = null | "google" | "email" | "magic";

/**
 * Écran de connexion / création de compte (design "Radar Login", plein écran).
 * Panneau éditorial (gauche, centré) + formulaire (droite). Google OAuth +
 * email/mot de passe + lien magique + mot de passe oublié via Supabase Auth.
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
  const [stats, setStats] = useState<StatsResp | null>(null);

  useEffect(() => {
    setEdition(editionInfo().label);
    fetchStats().then(setStats);
  }, []);

  const isRegister = mode === "register";
  // URL de redirection d'auth : URL canonique de prod si définie (Vercel),
  // sinon l'origine courante (dev local). Évite le renvoi vers localhost.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : undefined);

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
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error)
        setError(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : error.message);
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

  // Repli si l'API stats n'a pas encore répondu (avant chargement).
  const FALLBACK_PANELS = [
    { n: "01", topic: "data", label: "Data / IA", color: "#8E5FB8", desc: "Petits modèles à < 3 B" },
    { n: "02", topic: "tech", label: "Tech", color: "#C8663A", desc: "WebGPU stabilise en prod" },
    { n: "03", topic: "biz", label: "Business", color: "#4E8D6E", desc: "Fundraise Series A ↑ 22 %" },
  ];

  // Contenu dynamique du panneau éditorial (vraies données).
  const panels = stats?.panels?.length ? stats.panels : FALLBACK_PANELS;
  const headline = stats?.headline || "Les modèles < 3 B rattrapent GPT-4.";
  const articleCount = stats?.articleCount;

  return (
    <>
      <style>{`@keyframes radFloatIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes radLogoSweep{0%{transform:translate(-50%,-50%) rotate(0)}100%{transform:translate(-50%,-50%) rotate(360deg)}}`}</style>

      <div className="flex h-screen w-full overflow-hidden bg-[#FFF7EA] font-sans">
        {/* ── Panneau éditorial (gauche) ── */}
        <div className="relative hidden flex-[1.15] flex-col overflow-hidden bg-[#1A0A08] px-[clamp(40px,5vw,84px)] py-[clamp(40px,5vw,72px)] text-[#FFF7EA] lg:flex">
          <div className="pointer-events-none absolute -right-36 -top-36 h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle,rgba(255,90,71,.16),transparent 65%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(circle,rgba(255,90,71,.08),transparent 65%)" }} />

          {/* Logo */}
          <div className="relative flex flex-none items-center gap-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[13px] bg-primary">
              <div className="h-4 w-4 rounded-full border-[3px] border-[#1A0A08]" />
              <div
                className="absolute left-1/2 top-1/2 h-px w-full origin-left"
                style={{ background: "linear-gradient(90deg,transparent,#1A0A08)", animation: "radLogoSweep 3s linear infinite" }}
              />
            </div>
            <div>
              <div className="text-[21px] font-bold leading-none tracking-[-0.014em]">{BRAND.name}</div>
              <div className="mt-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#FFF7EA]/55">
                {edition}
              </div>
            </div>
          </div>

          {/* Éditorial centré */}
          <div className="relative flex max-w-[640px] flex-1 flex-col justify-center" style={{ animation: "radFloatIn .6s ease-out both" }}>
            <div className="mb-8 inline-flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-2 w-2 animate-pulseDot rounded-full bg-primary" />
              Ce matin dans le brief
            </div>

            <h1 className="mb-7 text-[clamp(40px,4vw,68px)] font-bold leading-[1] tracking-[-0.035em] [text-wrap:balance]">
              {headline}
            </h1>

            <p className="mb-11 max-w-[520px] text-[clamp(15px,1.15vw,17px)] leading-[1.55] text-[#FFF7EA]/[0.66]">
              Radar lit, dédoublonne et résume les sources en continu — tu ouvres, tu as le signal du
              jour en deux minutes.
            </p>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#FFF7EA]/[0.12] bg-[#FFF7EA]/[0.12]">
              {panels.map((s) => (
                <div key={s.n} className="bg-[#1A0A08] p-[22px_20px]">
                  <div className="mb-2 flex items-baseline gap-2.5">
                    <span className="text-[28px] font-bold leading-[0.9] tracking-[-0.03em]" style={{ color: s.color }}>
                      {s.n}
                    </span>
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#FFF7EA]/55">
                      {s.label}
                    </span>
                  </div>
                  <div className="line-clamp-2 text-[13px] leading-[1.35] text-[#FFF7EA]/75">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex flex-none flex-wrap items-center justify-between gap-6 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#FFF7EA]/40">
            <span>{articleCount != null ? articleCount : "…"} articles analysés</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-[#4E8D6E]" />
              Fait à Bordeaux
            </span>
          </div>
        </div>

        {/* ── Formulaire (droite) ── */}
        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-10 sm:px-12 lg:px-[clamp(40px,5vw,80px)]">
          <div className="mx-auto w-full max-w-[400px]" style={{ animation: "radFloatIn .6s ease-out .15s both" }}>
            <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {isRegister ? "Créer un compte" : "Se connecter"}
            </div>

            <h2 className="mb-3 text-[44px] font-bold leading-none tracking-[-0.028em] text-[#1A0A08]">
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
            <div className="my-5 flex items-center gap-3.5">
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
            <div className="mt-3.5 text-center">
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
            <div className="mt-5 border-t border-[#1A0A08]/[0.1] pt-5 text-center text-[13px] text-[#1A0A08]/60">
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
    </>
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
