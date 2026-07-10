import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { AuthRedirect } from "@/components/AuthRedirect";

/**
 * Landing publique de Radar (racine « / »). L'appli vit sous « /app ».
 * Design « Radar Landing 4a » : cream #FFF7EA, corail #FF5A47, noir chaud #1A0A08.
 * Couleurs codées en dur (indépendant du thème sombre) pour rester pixel-fidèle.
 * Composant serveur : aucune JS cliente requise (anims CSS + <details> natif).
 */

export const metadata: Metadata = {
  title: `${BRAND.name} — La veille qui lit à ta place`,
  description:
    "Radar écoute 86 sources tech, résume chaque article avec l'IA et te sert 3 signaux le matin. Un brief, 2 minutes.",
};

// Où pointent tous les CTA : l'appli (écran de connexion puis le fil).
const APP = "/app";

const CREAM = "#FFF7EA";
const INK = "#1A0A08";
const CORAL = "#FF5A47";

/* ── Petits blocs réutilisés ───────────────────────────────────────── */

function Radar({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  // Logo : carré arrondi + balayage radar corail. `dark` = carré cream sur fond sombre.
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: dark ? CORAL : INK,
      }}
      aria-hidden
    >
      <span
        className="rounded-full"
        style={{
          width: size * 0.32,
          height: size * 0.32,
          border: `2.5px solid ${dark ? INK : CORAL}`,
        }}
      />
      <span
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          width: "100%",
          height: 1,
          background: `linear-gradient(90deg,transparent,${dark ? INK : CORAL})`,
          transformOrigin: "left center",
          animation: "radSweep 3s linear infinite",
        }}
      />
    </span>
  );
}

function ChapterHead({
  n,
  label,
  right,
  dark = false,
  accent = false,
}: {
  n: string;
  label: string;
  right: string;
  dark?: boolean;
  accent?: boolean;
}) {
  const line = dark ? "rgba(255,247,234,.15)" : "rgba(26,10,8,.12)";
  const muted = dark ? "rgba(255,247,234,.45)" : "rgba(26,10,8,.42)";
  const dotColor = accent ? CORAL : dark ? CORAL : INK;
  const labelColor = accent || dark ? CORAL : "rgba(26,10,8,.5)";
  return (
    <div className="mb-10 flex items-baseline gap-6">
      <div
        className="inline-flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em]"
        style={{ color: labelColor }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
        Chapitre {n} · {label}
      </div>
      <div className="hidden h-px flex-1 sm:block" style={{ background: line }} />
      <div
        className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.14em] md:block"
        style={{ color: muted }}
      >
        {right}
      </div>
    </div>
  );
}

function Bullet({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span
        className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-bold leading-none"
        style={{ background: INK, color: CORAL }}
      >
        {icon}
      </span>
      <div>
        <b className="text-[14.5px]" style={{ color: INK }}>
          {title}
        </b>
        <div className="mt-[3px] text-[13px] leading-[1.5]" style={{ color: "rgba(26,10,8,.6)" }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

const SOURCES = [
  "The Batch", "Hacker News", "Sifted", "TechCrunch", "Ars Technica",
  "The Information", "Latent Space", "CB Insights", "InfoQ", "A List Apart",
  "Stack Overflow", "Smashing Mag", "Nielsen Norman", "Contexte", "Euractiv",
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function Landing() {
  return (
    <div style={{ background: CREAM, color: INK }} className="min-h-screen font-sans">
      <AuthRedirect />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes radSweep{0%{transform:translate(-50%,-50%) rotate(0)}100%{transform:translate(-50%,-50%) rotate(360deg)}}
            @keyframes radPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.55}}
            @keyframes radMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
            .rad-faq summary::-webkit-details-marker{display:none}
            .rad-faq summary{list-style:none}
            .rad-faq details[open] .rad-plus{transform:rotate(45deg)}
            .rad-plus{transition:transform .2s;display:inline-block}
          `,
        }}
      />

      {/* ── Top rail (sticky) ── */}
      <header
        className="sticky top-0 z-50 flex items-center gap-7 border-b px-6 py-4 backdrop-blur-sm sm:px-10"
        style={{ borderColor: "rgba(26,10,8,.08)", background: "rgba(255,247,234,.92)" }}
      >
        <a href={APP} className="flex items-center gap-3" style={{ textDecoration: "none", color: INK }}>
          <Radar size={34} />
          <div>
            <div className="text-[16.5px] font-bold leading-none tracking-[-0.01em]">Radar</div>
            <div
              className="mt-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgba(26,10,8,.5)" }}
            >
              La veille qui lit à ta place
            </div>
          </div>
        </a>

        <nav
          className="ml-2 hidden items-center gap-0.5 rounded-full p-[3px] lg:flex"
          style={{ background: "rgba(26,10,8,.05)" }}
        >
          {[
            ["#produit", "Le produit"],
            ["#brief", "Le brief"],
            ["#mobile", "Mobile"],
            ["#prix", "Prix"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-[12.5px] font-medium"
              style={{ color: "rgba(26,10,8,.65)", textDecoration: "none" }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3.5">
          <a
            href={APP}
            className="hidden text-[13px] font-medium sm:inline"
            style={{ color: "rgba(26,10,8,.7)", textDecoration: "none" }}
          >
            Se connecter
          </a>
          <a
            href={APP}
            className="inline-flex items-center gap-2 rounded-full px-5 py-[11px] text-[13px] font-semibold"
            style={{ background: CORAL, color: CREAM, textDecoration: "none" }}
          >
            Essayer Radar <span className="text-[15px] leading-none">→</span>
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        id="produit"
        className="grid border-b lg:grid-cols-[0.94fr_1.06fr]"
        style={{ borderColor: "rgba(26,10,8,.08)" }}
      >
        {/* Copy */}
        <div className="flex flex-col justify-center px-6 py-16 sm:px-14 lg:py-20">
          <div className="flex flex-wrap items-center gap-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap" style={{ color: CORAL }}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: CORAL, boxShadow: "0 0 0 4px rgba(255,90,71,.18)", animation: "radPulse 1.6s ease-in-out infinite" }}
              />
              Radar · Éd. du jour · Nº 187
            </span>
            <span style={{ color: "rgba(26,10,8,.4)" }}>247 articles</span>
          </div>

          <h1 className="mt-10 text-[clamp(46px,7vw,82px)] font-bold leading-[0.92] tracking-[-0.038em] [text-wrap:balance]">
            247 articles<br />lus pour toi.<br />
            <span style={{ color: CORAL }}>Un brief. 2&nbsp;min.</span>
          </h1>

          <p className="mt-6 max-w-[520px] text-[clamp(16px,1.4vw,19px)] leading-[1.55]" style={{ color: "rgba(26,10,8,.66)" }}>
            Radar écoute 86 sources tech, <b style={{ color: INK, fontWeight: 600 }}>résume chaque article avec l&apos;IA</b> et
            te sert 3 signaux le matin. Tu lis le résumé — un clic, tu es sur la source si tu veux creuser.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={APP}
              className="inline-flex items-center gap-3 rounded-full px-7 py-[17px] text-[14.5px] font-bold"
              style={{ background: CORAL, color: CREAM, textDecoration: "none", boxShadow: "0 14px 30px -12px rgba(255,90,71,.55)" }}
            >
              Créer mon Radar — 60 s <span className="text-[17px] leading-none">→</span>
            </a>
            <a
              href="#brief"
              className="inline-flex items-center gap-2 rounded-full border px-6 py-4 text-[13.5px] font-semibold"
              style={{ borderColor: "rgba(26,10,8,.16)", color: INK, textDecoration: "none" }}
            >
              Voir un brief <span className="text-[15px] leading-none">↓</span>
            </a>
          </div>

          <div className="mt-9 flex items-center gap-4 text-[12px]" style={{ color: "rgba(26,10,8,.55)" }}>
            <div className="flex">
              {[["KG", CORAL], ["LP", "#4E8D6E"], ["SM", "#C8663A"], ["+", "#8E5FB8"]].map(([t, c], i) => (
                <span
                  key={t}
                  className="grid h-[26px] w-[26px] place-items-center rounded-full text-[9.5px] font-bold"
                  style={{ background: c, color: INK, border: `2px solid ${CREAM}`, marginLeft: i ? -8 : 0 }}
                >
                  {t}
                </span>
              ))}
            </div>
            <span>
              Rejoint par <b style={{ color: INK, fontWeight: 600 }}>1 240</b> curieux · gratuit pour les étudiants
            </span>
          </div>
        </div>

        {/* Product mockup */}
        <div className="relative overflow-hidden px-6 pt-12 sm:px-11" style={{ background: INK }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 20% 20%,rgba(255,90,71,.14),transparent 55%),radial-gradient(circle at 80% 80%,rgba(200,102,58,.12),transparent 60%)" }}
          />
          <div
            className="relative overflow-hidden"
            style={{ background: CREAM, borderRadius: "14px 14px 0 0", boxShadow: "0 40px 80px -20px rgba(0,0,0,.5)" }}
          >
            {/* browser chrome */}
            <div className="flex items-center gap-2.5 border-b px-3.5 py-[11px]" style={{ background: "#F3EBD8", borderColor: "rgba(26,10,8,.08)" }}>
              <div className="flex gap-1.5">
                {[CORAL, "#F2B03C", "#4E8D6E"].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div
                className="mx-auto max-w-[260px] flex-1 rounded-md px-2.5 py-[3px] text-center font-mono text-[10px] font-medium"
                style={{ background: CREAM, color: "rgba(26,10,8,.5)" }}
              >
                radar.app / pour toi
              </div>
              <div className="w-[52px]" />
            </div>

            {/* app body */}
            <div className="flex h-[520px]">
              {/* sidebar */}
              <div className="hidden w-[160px] shrink-0 flex-col px-2.5 py-3.5 sm:flex" style={{ background: INK, color: CREAM }}>
                <div className="flex items-center gap-2 px-1 pb-3.5">
                  <Radar size={22} dark />
                  <div>
                    <div className="text-[12px] font-bold leading-none">Radar</div>
                    <div className="mt-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(255,247,234,.5)" }}>
                      Nº 187
                    </div>
                  </div>
                </div>
                <div className="mb-1.5 mt-0.5 px-1.5 font-mono text-[7.5px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,247,234,.5)" }}>
                  Mon flux
                </div>
                <div className="mb-0.5 rounded-lg px-2 py-1.5 text-[10.5px] font-bold" style={{ background: "#FBF7EE", color: "#260000" }}>
                  Pour toi
                </div>
                {["Brief du jour", "Enregistrés", "Tendances"].map((l) => (
                  <div key={l} className="mb-0.5 px-2 py-1.5 text-[10.5px] font-medium" style={{ color: "rgba(255,247,234,.75)" }}>
                    {l}
                  </div>
                ))}
                <div className="mb-1.5 mt-3.5 px-1.5 font-mono text-[7.5px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,247,234,.5)" }}>
                  Domaines
                </div>
                {[["Tous", CORAL], ["Tech", "#C8663A"], ["Data / IA", "#8E5FB8"], ["Business", "#4E8D6E"]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 px-2 py-[5px] text-[10px]" style={{ color: "rgba(255,247,234,.75)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                    {l}
                  </div>
                ))}
                <div className="mt-auto flex items-center gap-2 border-t pt-2.5" style={{ borderColor: "rgba(255,247,234,.14)" }}>
                  <span className="grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-bold" style={{ background: CORAL, color: INK }}>
                    KG
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-[10px] font-semibold">Kylian G.</div>
                    <div className="text-[8.5px]" style={{ color: "rgba(255,247,234,.5)" }}>Max</div>
                  </div>
                </div>
              </div>

              {/* main */}
              <div className="flex min-w-0 flex-1 flex-col" style={{ background: "#FBF7EE" }}>
                <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "rgba(26,10,8,.08)", background: CREAM }}>
                  <div className="flex max-w-[220px] flex-1 items-center gap-1.5 rounded-[9px] border px-2.5 py-1.5" style={{ borderColor: "rgba(26,10,8,.09)", background: CREAM }}>
                    <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: "rgba(26,10,8,.3)" }} />
                    <span className="text-[10.5px]" style={{ color: "rgba(26,10,8,.4)" }}>Rechercher un sujet…</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-[5px]" style={{ background: "rgba(78,141,110,.14)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#4E8D6E" }} />
                    <span className="text-[9.5px] font-semibold" style={{ color: "#2F6549" }}>Synchro</span>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden px-5 pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL, boxShadow: "0 0 0 3px rgba(255,90,71,.2)" }} />
                    <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>Le fil du jour · Nº 187</span>
                    <span className="h-px flex-1" style={{ background: "rgba(26,10,8,.1)" }} />
                    <span className="font-mono text-[8px] font-semibold" style={{ color: "rgba(26,10,8,.42)" }}>8/14 lus</span>
                  </div>
                  <div className="mb-2.5 text-[24px] font-bold leading-none tracking-[-0.018em]">Pour toi.</div>

                  <div className="mb-3 flex items-center gap-3 rounded-[12px] px-3.5 py-3" style={{ background: INK, color: CREAM }}>
                    <div className="min-w-0 flex-1">
                      <div className="mb-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: CORAL }}>Brief · Nº 187</div>
                      <div className="mb-[3px] text-[12.5px] font-bold leading-tight">Ce qui ressort du flux aujourd&apos;hui.</div>
                      <div className="text-[9.5px]" style={{ color: "rgba(255,247,234,.55)" }}>3 signaux · 247 articles analysés</div>
                    </div>
                    <div className="shrink-0 whitespace-nowrap text-[10.5px] font-bold" style={{ color: CORAL }}>Ouvrir →</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { cat: "Data / IA", c: "#8E5FB8", g: "linear-gradient(135deg,#8E5FB8,#5B3E82)", t: "Small models under 3B match GPT-4", d: "Distilled SLMs hit 94% of foundation perf — at 1/100th the cost.", src: "The Batch", strong: true },
                      { cat: "Tech", c: "#C8663A", g: "linear-gradient(135deg,#C8663A,#8E4423)", t: "Edge runtimes go WASM by default", d: "Sub-ms cold start, same binary dev → prod.", src: "InfoQ" },
                      { cat: "Business", c: "#4E8D6E", g: "linear-gradient(135deg,#4E8D6E,#2F6549)", t: "Cloud EU dépasse 15 % de PDM", d: "Portée par la commande publique, l'offre souveraine gagne du terrain.", src: "Contexte", read: true },
                      { cat: "Business", c: "#4E8D6E", g: "linear-gradient(135deg,#4E8D6E,#2F6549)", t: "Fathom raises $400M for agents", d: "Series C at $3.2B. Bet: agents that execute workflows.", src: "TechCrunch" },
                    ].map((a) => (
                      <div key={a.t} className="overflow-hidden rounded-[12px] border" style={{ background: CREAM, borderColor: "rgba(26,10,8,.09)", opacity: a.read ? 0.62 : 1 }}>
                        <div className="relative h-[52px]" style={{ background: a.g }}>
                          <span className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold" style={{ background: "rgba(255,247,234,.92)", color: a.c }}>{a.cat}</span>
                          {a.strong && <span className="absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 font-mono text-[7.5px] font-bold" style={{ background: "rgba(255,90,71,.16)", color: CORAL }}>Signal fort</span>}
                        </div>
                        <div className="px-2.5 pb-2.5 pt-2.5">
                          <div className="mb-1.5 text-[11.5px] font-bold leading-[1.22]">{a.t}</div>
                          <div className="mb-2 line-clamp-2 text-[10px] leading-[1.4]" style={{ color: "rgba(26,10,8,.55)" }}>{a.d}</div>
                          <div className="flex items-center gap-1.5 border-t pt-[7px] text-[9px]" style={{ borderColor: "rgba(26,10,8,.08)", color: "rgba(26,10,8,.5)" }}>
                            <b style={{ color: INK, fontWeight: 600 }}>{a.src}</b>
                            <span className="ml-auto">{a.read ? "Lu" : "+"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute right-8 top-11 rounded-full px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ background: CORAL, color: "#FFF6EA", transform: "rotate(4deg)", boxShadow: "0 12px 28px -8px rgba(0,0,0,.35)" }}
          >
            ← ton fil, chaque matin
          </div>
        </div>
      </section>

      {/* ── Sources marquee ── */}
      <section className="flex items-center gap-10 overflow-hidden border-b py-9 pl-6 sm:pl-14" style={{ background: "#F0E6D4", borderColor: "rgba(26,10,8,.08)" }}>
        <div className="w-[180px] shrink-0 font-mono text-[10.5px] font-bold uppercase leading-[1.4] tracking-[0.14em]" style={{ color: "rgba(26,10,8,.5)" }}>
          Radar surveille en continu <b style={{ color: CORAL }}>86 sources</b>
        </div>
        <div
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{ WebkitMaskImage: "linear-gradient(90deg,transparent 0,#000 60px,#000 calc(100% - 100px),transparent 100%)", maskImage: "linear-gradient(90deg,transparent 0,#000 60px,#000 calc(100% - 100px),transparent 100%)" }}
        >
          <div className="flex w-max items-center gap-14" style={{ animation: "radMarquee 42s linear infinite", color: "rgba(26,10,8,.62)" }}>
            {[...SOURCES, ...SOURCES].map((s, i) => (
              <span key={i} className="shrink-0 whitespace-nowrap text-[22px] font-semibold tracking-[-0.01em]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chapitre 01 · Le problème ── */}
      <section className="border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="01" label="Le problème" right="Toi vs. ton feed" />
          <div className="grid items-end gap-16 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <h2 className="text-[clamp(42px,6vw,78px)] font-bold leading-[0.94] tracking-[-0.035em] [text-wrap:balance]">
                Il y a plus de <span style={{ color: CORAL }}>signal</span> qu&apos;avant. Beaucoup plus de{" "}
                <span style={{ color: "rgba(26,10,8,.4)" }}>bruit</span> aussi.
              </h2>
              <p className="mt-8 max-w-[640px] text-[19px] leading-[1.6]" style={{ color: "rgba(26,10,8,.66)" }}>
                Twitter, newsletters, Substack, Slack, LinkedIn — on n&apos;a jamais eu autant de sources et jamais
                aussi peu de temps. Radar écoute pour toi, dédoublonne les mêmes 12 versions d&apos;une info, garde ce
                qui compte.
              </p>
            </div>
            <div className="grid gap-0">
              {[
                ["247", INK, "Articles", "à trier chaque jour dans les 86 flux qu'on écoute pour toi."],
                ["3h20", CORAL, "De lecture", "que tu récupères chaque semaine grâce aux résumés générés par Radar."],
                ["03", "#4E8D6E", "Signaux", "que Radar extrait du flux chaque matin. Le reste, tu peux l'oublier."],
              ].map(([num, color, label, desc], i) => (
                <div key={label} className="flex items-baseline gap-5 border-t py-6" style={{ borderColor: "rgba(26,10,8,.15)", borderBottom: i === 2 ? "1px solid rgba(26,10,8,.15)" : undefined }}>
                  <div className="w-[130px] shrink-0 text-[clamp(44px,5vw,64px)] font-bold leading-[0.9] tracking-[-0.035em]" style={{ color }}>
                    {num}
                  </div>
                  <div className="text-[14px] leading-[1.45]" style={{ color: "rgba(26,10,8,.62)" }}>
                    <b style={{ color: INK, fontWeight: 600 }}>{label}</b> {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 02 · Traduction française ── */}
      <section className="overflow-hidden border-b px-6 py-24 sm:px-14" style={{ background: "#F0E6D4", borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="02" label="Traduction française" right="Ce que personne d'autre ne fait" accent />
          <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* VO */}
              <div className="relative rounded-[18px] border p-6" style={{ background: CREAM, borderColor: "rgba(26,10,8,.09)", boxShadow: "0 22px 44px -20px rgba(26,10,8,.15)" }}>
                <div className="absolute -top-2.5 left-5 rounded-[20px] px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ background: INK, color: CREAM }}>Original</div>
                <div className="mb-4 mt-1.5 flex items-center gap-2">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: "rgba(26,10,8,.4)" }} />
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(26,10,8,.55)" }}>Article en anglais</span>
                </div>
                <div className="mb-1.5 text-[11.5px]" style={{ color: "rgba(26,10,8,.55)" }}><b style={{ color: INK, fontWeight: 600 }}>The Batch</b> · il y a 2 h</div>
                <div className="mb-3 text-[17px] font-bold leading-[1.22] tracking-[-0.012em]">Small models under 3B match GPT-4 on structured reasoning</div>
                <div className="mb-3.5 text-[12.5px] leading-[1.55]" style={{ color: "rgba(26,10,8,.7)" }}>A new generation of distilled small language models hits 94% of foundation model performance — at 1/100th the inference cost.</div>
                <div className="rounded-[11px] px-3.5 py-3" style={{ background: INK }}>
                  <div className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,247,234,.55)" }}>À citer</div>
                  <div className="text-[12px] italic leading-[1.45]" style={{ color: CREAM }}>« The future isn&apos;t about bigger models — it&apos;s about the right-sized one. »</div>
                </div>
              </div>
              {/* FR */}
              <div className="relative rounded-[18px] p-6" style={{ background: CREAM, border: `2px solid ${CORAL}`, boxShadow: "0 30px 60px -20px rgba(255,90,71,.35)" }}>
                <div className="absolute -top-2.5 left-5 rounded-[20px] px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ background: CORAL, color: CREAM }}>Traduit par Radar · 1 clic</div>
                <div className="mb-4 mt-1.5 flex items-center gap-2">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: CORAL, boxShadow: "0 0 0 3px rgba(255,90,71,.2)" }} />
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>Article en français</span>
                </div>
                <div className="mb-1.5 text-[11.5px]" style={{ color: "rgba(26,10,8,.55)" }}><b style={{ color: INK, fontWeight: 600 }}>The Batch</b> · il y a 2 h</div>
                <div className="mb-3 text-[17px] font-bold leading-[1.22] tracking-[-0.012em]">Les modèles &lt; 3B rattrapent GPT-4 sur le raisonnement structuré</div>
                <div className="mb-3.5 text-[12.5px] leading-[1.55]" style={{ color: "rgba(26,10,8,.7)" }}>Une nouvelle génération de « small language models » distillés atteint 94 % des perfs des grands modèles — pour un centième du coût.</div>
                <div className="rounded-[11px] px-3.5 py-3" style={{ background: INK }}>
                  <div className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: CORAL }}>À citer</div>
                  <div className="text-[12px] italic leading-[1.45]" style={{ color: CREAM }}>« L&apos;avenir n&apos;est pas au plus gros modèle, mais au plus juste. »</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[clamp(40px,5vw,64px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
                On traduit la tech mondiale en français. En un clic.
              </h2>
              <p className="mt-7 max-w-[490px] text-[18px] leading-[1.55]" style={{ color: "rgba(26,10,8,.68)" }}>
                70 % de la meilleure tech se lit en anglais. Radar te sert l&apos;article <b style={{ color: INK, fontWeight: 600 }}>en langue d&apos;origine</b> —
                puis, si tu veux, <b style={{ color: CORAL, fontWeight: 600 }}>tu le traduis en français</b>. Titre, résumé, citation.
              </p>
              <p className="mt-5 max-w-[460px] text-[15px] leading-[1.55]" style={{ color: "rgba(26,10,8,.55)" }}>
                Pas de traduction automatique douteuse : nos LLM sont calibrés sur le lexique tech FR. Le sens tient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 03 · Comment ça marche (dark) ── */}
      <section className="border-b px-6 py-24 sm:px-14" style={{ background: INK, color: CREAM, borderColor: "rgba(26,10,8,.15)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="03" label="Comment ça marche" right="3 étapes · 60 s à mettre en place" dark accent />
          <h2 className="mb-16 max-w-[1000px] text-[clamp(42px,6vw,78px)] font-bold leading-[0.94] tracking-[-0.035em] [text-wrap:balance]">
            Tu choisis tes sources. Radar fait le reste.
          </h2>
          <div className="grid gap-px overflow-hidden rounded-[22px] lg:grid-cols-3" style={{ background: "rgba(255,247,234,.15)" }}>
            {[
              { n: "01", c: CORAL, kicker: "Écoute", title: "Tu colles tes sources.", desc: "Newsletters, blogs, RSS, comptes X, YouTube — n'importe quoi qui pond du contenu. Radar dédoublonne et catégorise automatiquement." },
              { n: "02", c: "#C8663A", kicker: "Résume avec l'IA", title: "L'IA résume, croise, garde le lien vers la source.", desc: "Une même actu vue chez 5 sources ? Un seul résumé IA, un score de fiabilité, 3 points clés — et le lien vers l'original toujours à un clic." },
              { n: "03", c: "#4E8D6E", kicker: "Sers-toi", title: "Un brief. La punchline. Zéro FOMO.", desc: "3 signaux à retenir, les chiffres du jour, une punchline à ressortir en réunion. Le reste vit dans ton fil, si tu veux creuser." },
            ].map((s) => (
              <div key={s.n} className="flex flex-col gap-6 p-10" style={{ background: INK }}>
                <div className="flex items-baseline gap-3.5">
                  <span className="text-[clamp(48px,5vw,68px)] font-bold leading-[0.9] tracking-[-0.045em]" style={{ color: s.c }}>{s.n}</span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: s.c }}>{s.kicker}</span>
                </div>
                <div>
                  <div className="mb-3.5 text-[24px] font-semibold leading-[1.25] tracking-[-0.012em]">{s.title}</div>
                  <div className="text-[14px] leading-[1.6]" style={{ color: "rgba(255,247,234,.6)" }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chapitre 04 · Feature 01 — Le brief ── */}
      <section id="brief" className="border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="04" label="Feature 01" right="Le brief du jour" accent />
          <div className="grid items-center gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: "rgba(255,90,71,.12)", color: CORAL }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} />
                Auto-généré · 06:00 chaque matin
              </div>
              <h2 className="text-[clamp(40px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
                Trois signaux. Une punchline. Deux minutes.
              </h2>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6]" style={{ color: "rgba(26,10,8,.66)" }}>
                Chaque matin, Radar te livre ce qui a bougé dans le flux, chiffré. Ce qui monte, ce qui compte, ce que
                tu peux ressortir en réunion — dans un objet éditorial construit pour être lu en 2 min.
              </p>
              <div className="mt-8 flex flex-col gap-[18px]">
                <Bullet icon="↑" title="3 signaux hiérarchisés" desc="Extraits parmi les 247 articles de la nuit, croisés & scorés." />
                <Bullet icon="#" title="Les chiffres du jour" desc="Ce que tu as évité de lire, chiffré depuis hier soir." />
                <Bullet icon="&#34;" title="La punchline de secours" desc="Une phrase à sortir quand la conversation débat sec." />
              </div>
              <a href={APP} className="mt-8 inline-flex items-center gap-2.5 text-[13px] font-bold" style={{ color: CORAL, textDecoration: "none" }}>
                Ouvrir un brief complet <span className="text-[15px] leading-none">→</span>
              </a>
            </div>

            {/* brief mockup */}
            <div className="overflow-hidden rounded-[20px] px-6 pt-8 sm:px-8" style={{ background: "linear-gradient(135deg,#1A0A08,#331A15)", boxShadow: "0 40px 80px -20px rgba(26,10,8,.4)" }}>
              <div className="px-6 pt-8 sm:px-10" style={{ background: CREAM, borderRadius: "14px 14px 0 0" }}>
                <div className="mb-3 flex items-center justify-between gap-3.5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>Brief du jour · auto-généré</div>
                  <span className="rounded-full border px-3 py-1 text-[10.5px] font-semibold" style={{ borderColor: "rgba(26,10,8,.15)" }}>↗ Partager</span>
                </div>
                <div className="mb-3 text-[clamp(24px,3vw,32px)] font-bold leading-[1.05] tracking-[-0.022em] [text-wrap:balance]">Ce qui ressort du flux aujourd&apos;hui.</div>
                <div className="mb-6 max-w-[440px] text-[13px] leading-[1.55]" style={{ color: "rgba(26,10,8,.6)" }}>
                  Journée dominée par la bascule des agents autonomes, l&apos;accélération WebAssembly côté edge et la persistance des petits modèles.
                </div>
                <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(26,10,8,.42)" }}>3 choses à retenir</div>
                {[
                  ["01", "#8E5FB8", "Data / IA", "Signal fort", "Small models under 3B match GPT-4", "Sur 12 benchmarks, les petits modèles talonnent les frontier — à coût d'inférence /40."],
                  ["02", "#C8663A", "Tech", "", "Edge runtimes go WASM by default", "Cloudflare, Fastly et Deno convergent sur WASM comme cible unique."],
                  ["03", "#4E8D6E", "Business", "", "Fathom raises $400M for agents", "Series C à 3,2 Md$. Le marché paie pour des actions, plus juste des réponses."],
                ].map(([n, c, cat, tag, title, desc]) => (
                  <div key={n} className="grid grid-cols-[56px_1fr] items-start gap-4 border-t py-4" style={{ borderColor: "rgba(26,10,8,.14)" }}>
                    <div className="text-[clamp(40px,5vw,52px)] font-bold leading-[0.85] tracking-[-0.045em]" style={{ color: c }}>{n}</div>
                    <div>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em]" style={{ color: c }}>{cat}</span>
                        {tag && <span className="rounded-[20px] px-1.5 py-0.5 font-mono text-[7.5px] font-bold" style={{ background: "rgba(255,90,71,.14)", color: CORAL }}>{tag}</span>}
                      </div>
                      <div className="mb-1 text-[15px] font-bold leading-[1.2] tracking-[-0.012em] [text-wrap:balance]">{title}</div>
                      <div className="text-[11px] leading-[1.5]" style={{ color: "rgba(26,10,8,.58)" }}>{desc}</div>
                    </div>
                  </div>
                ))}

                <div className="mt-5 border-t pt-4" style={{ borderColor: "rgba(26,10,8,.14)" }}>
                  <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(26,10,8,.42)" }}>Les chiffres du jour</div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[["247", CORAL, "articles analysés"], ["86", CREAM, "sources actives"], ["3h20", CREAM, "gagnées / semaine"], ["78", "#4E8D6E", "score moyen"]].map(([v, c, l]) => (
                      <div key={l} className="rounded-[10px] px-3 py-2.5" style={{ background: INK, color: CREAM }}>
                        <div className="text-[22px] font-bold leading-none tracking-[-0.02em]" style={{ color: c }}>{v}</div>
                        <div className="mt-1.5 text-[9.5px] leading-tight" style={{ color: "rgba(255,247,234,.55)" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mx-[-40px] mt-5 px-10 py-5" style={{ background: "rgba(255,90,71,.12)", borderTop: "1px solid rgba(255,90,71,.28)" }}>
                  <div className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#E0503F" }}>La punchline de secours</div>
                  <div className="text-[14px] font-medium italic leading-[1.4]">« Qui capte la valeur des agents autonomes — les fournisseurs de modèles ou ceux qui les orchestrent ? »</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 04 · Feature 02 — Le fil ── */}
      <section className="border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="04" label="Feature 02" right="Le fil éditorial" accent />
          <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
            {/* feed mockup */}
            <div className="rounded-[20px] p-5" style={{ background: "#F0E6D4", boxShadow: "0 40px 80px -20px rgba(26,10,8,.25)" }}>
              <div className="overflow-hidden rounded-[14px] border" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
                <div className="flex items-center gap-2.5 border-b px-4 py-2.5" style={{ borderColor: "rgba(26,10,8,.08)" }}>
                  <div className="flex w-[200px] items-center gap-1.5 rounded-[9px] border px-2.5 py-1.5" style={{ background: "#fff", borderColor: "rgba(26,10,8,.09)" }}>
                    <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: "rgba(26,10,8,.3)" }} />
                    <span className="text-[10.5px]" style={{ color: "rgba(26,10,8,.45)" }}>Rechercher…</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-[5px]" style={{ background: "rgba(78,141,110,.14)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#4E8D6E" }} />
                    <span className="text-[9.5px] font-semibold" style={{ color: "#2F6549" }}>Synchro · 14:33</span>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL, boxShadow: "0 0 0 3px rgba(255,90,71,.18)" }} />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>Le fil du jour · Nº 187</span>
                    <span className="h-px flex-1" style={{ background: "rgba(26,10,8,.1)" }} />
                    <span className="font-mono text-[9px] font-semibold" style={{ color: "rgba(26,10,8,.42)" }}>8 / 14 lus</span>
                  </div>
                  <div className="mb-4.5 flex items-baseline gap-3" style={{ marginBottom: 18 }}>
                    <div className="flex-1 text-[26px] font-bold leading-none tracking-[-0.018em]">Pour toi.</div>
                    <div className="flex gap-0.5 rounded-full p-0.5" style={{ background: "rgba(26,10,8,.06)" }}>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold" style={{ color: "#260000", boxShadow: "0 1px 2px rgba(38,0,0,.1)" }}>Confort</span>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ color: "rgba(38,0,0,.5)" }}>Compact</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { cat: "Data / IA", c: "#8E5FB8", g: "linear-gradient(135deg,#8E5FB8,#5B3E82)", t: "Small models under 3B match GPT-4", src: "The Batch", strong: true },
                      { cat: "Tech", c: "#C8663A", g: "linear-gradient(135deg,#C8663A,#8E4423)", t: "Edge runtimes go WASM by default", src: "InfoQ" },
                      { cat: "Business", c: "#4E8D6E", g: "linear-gradient(135deg,#4E8D6E,#2F6549)", t: "Fathom raises $400M for agents", src: "TechCrunch" },
                      { cat: "UX", c: "#B4568F", g: "linear-gradient(135deg,#B4568F,#7A3862)", t: "Figma ships production code", src: "Smashing Mag", strong: true },
                      { cat: "Tech", c: "#C8663A", g: "linear-gradient(135deg,#C8663A,#8E4423)", t: "PostgreSQL 18 ships vector search", src: "Hacker News", read: true },
                      { cat: "Data / IA", c: "#5566C7", g: "linear-gradient(135deg,#5566C7,#3B4A99)", t: "L'AI Act entre en vigueur", src: "Euractiv" },
                    ].map((a) => (
                      <div key={a.t} className="overflow-hidden rounded-[14px] border" style={{ background: "#fff", borderColor: "rgba(26,10,8,.09)", opacity: a.read ? 0.6 : 1, boxShadow: "0 4px 12px -6px rgba(26,10,8,.08)" }}>
                        <div className="relative h-[52px]" style={{ background: a.g }}>
                          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold" style={{ background: "rgba(255,247,234,.92)", color: a.c }}>{a.cat}</span>
                          {a.strong && <span className="absolute bottom-2 right-2 rounded-full px-1.5 py-0.5 font-mono text-[7.5px] font-bold" style={{ background: "rgba(255,90,71,.18)", color: CORAL }}>Signal fort</span>}
                        </div>
                        <div className="px-3 pb-3 pt-2.5">
                          <div className="mb-1.5 text-[11.5px] font-bold leading-[1.22]">{a.t}</div>
                          <div className="flex items-center gap-1.5 border-t pt-[7px] text-[9px]" style={{ borderColor: "rgba(26,10,8,.08)", color: "rgba(26,10,8,.5)" }}>
                            <b style={{ color: INK, fontWeight: 600 }}>{a.src}</b>
                            <span className="ml-auto">{a.read ? "Lu" : "+"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: "rgba(255,90,71,.12)", color: CORAL }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} />
                Un fil pensé pour être lu
              </div>
              <h2 className="text-[clamp(40px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
                Pas 247 articles. Ceux qui comptent, résumés.
              </h2>
              <p className="mt-6 max-w-[480px] text-[17px] leading-[1.6]" style={{ color: "rgba(26,10,8,.66)" }}>
                Chaque article passe par Radar : résumé en 2-3 phrases, thème coloré, source citée, score de pertinence.
                Tu parcours le fil du jour en 2 min et tu ouvres ce qui t&apos;intéresse — jamais l&apos;inverse.
              </p>
              <div className="mt-8 flex flex-col gap-[18px]">
                <Bullet icon="→" title="Résumé par Radar" desc="2 min pour tout parcourir, sans jamais quitter l'app." />
                <Bullet icon="→" title="Filtre par thème" desc="Tech, Business, Data / IA, UX — un clic pour zoomer sur ton domaine." />
                <Bullet icon="→" title="État de lecture persistant" desc="Les articles ouverts s'estompent — tu retrouves toujours où tu en es." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 04 · Feature 03 — Tendances (dark) ── */}
      <section className="border-b px-6 py-24 sm:px-14" style={{ background: INK, color: CREAM, borderColor: "rgba(26,10,8,.15)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="04" label="Feature 03" right="Les tendances" dark accent />
          <div className="grid items-center gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: "rgba(255,90,71,.14)", color: CORAL }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} />
                7 jours · 30 jours · 90 jours
              </div>
              <h2 className="text-[clamp(40px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
                Sens où souffle le vent. Sans lire 4 200 articles.
              </h2>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6]" style={{ color: "rgba(255,247,234,.62)" }}>
                Radar mesure la fréquence, la vélocité et la variation des sujets — pour te montrer les signaux forts et
                les signaux faibles qui montent avant que la presse s&apos;en empare.
              </p>
              <div className="mt-8 flex flex-col gap-0">
                {[["Sujets qui montent", "+ 47 % en 7 j", "#5FAE8A"], ["Signaux faibles détectés", "03 cette semaine", CORAL], ["Sources les plus actives", "86 monitorées", "rgba(255,247,234,.65)"]].map(([l, v, c], i) => (
                  <div key={l} className="flex items-baseline justify-between border-t py-3.5" style={{ borderColor: "rgba(255,247,234,.12)", borderBottom: i === 2 ? "1px solid rgba(255,247,234,.12)" : undefined }}>
                    <span className="text-[14px] font-medium">{l}</span>
                    <span className="font-mono text-[12px] font-bold" style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* trends mockup */}
            <div className="rounded-[20px] border p-7" style={{ background: "rgba(255,247,234,.04)", borderColor: "rgba(255,247,234,.12)", boxShadow: "0 40px 80px -20px rgba(0,0,0,.4)" }}>
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL, boxShadow: "0 0 0 3px rgba(255,90,71,.18)" }} />
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>Le pouls · Nº 187</span>
                <span className="h-px flex-1" style={{ background: "rgba(255,247,234,.14)" }} />
                <div className="flex gap-0.5 rounded-full p-0.5" style={{ background: "rgba(255,247,234,.06)" }}>
                  <span className="rounded-full px-2 py-[3px] font-mono text-[9px] font-bold" style={{ background: "rgba(255,247,234,.1)" }}>7 j</span>
                  <span className="rounded-full px-2 py-[3px] font-mono text-[9px] font-medium" style={{ color: "rgba(255,247,234,.5)" }}>30 j</span>
                  <span className="rounded-full px-2 py-[3px] font-mono text-[9px] font-medium" style={{ color: "rgba(255,247,234,.5)" }}>90 j</span>
                </div>
              </div>
              <div className="text-[24px] font-bold leading-[1.05] tracking-[-0.022em]">Le pouls de l&apos;écosystème.</div>
              <div className="mb-4 mt-1 text-[11px]" style={{ color: "rgba(255,247,234,.5)" }}>Ce que Radar détecte, mesure et classe — sans que tu aies à lire 247 articles.</div>

              <div className="mb-3 grid grid-cols-4 gap-2.5">
                {[["247", "articles analysés"], ["86", "sources actives"], ["3 h 20", "lecture économisée"], ["78/100", "pertinence moy."]].map(([v, l]) => (
                  <div key={l} className="rounded-[10px] px-3 py-3" style={{ background: "rgba(255,247,234,.06)" }}>
                    <div className="text-[19px] font-bold leading-none">{v}</div>
                    <div className="mt-1.5 text-[9px] leading-tight" style={{ color: "rgba(255,247,234,.5)" }}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-[1.1fr_1fr]">
                <div className="rounded-[12px] border p-4" style={{ background: "rgba(255,247,234,.05)", borderColor: "rgba(255,247,234,.09)" }}>
                  <div className="mb-0.5 flex items-baseline justify-between">
                    <div className="text-[11.5px] font-semibold">Sujets qui montent</div>
                    <div className="font-mono text-[8.5px]" style={{ color: "rgba(255,247,234,.42)" }}>Top 5 · 7 j</div>
                  </div>
                  <div className="mb-3 text-[9.5px]" style={{ color: "rgba(255,247,234,.42)" }}>Variation du volume, croisement des sources</div>
                  {[["Agents autonomes", "+142 %", 92], ["Small language models", "+88 %", 74], ["WebAssembly edge", "+61 %", 60], ["Souveraineté cloud EU", "+45 %", 50]].map(([l, v, w]) => (
                    <div key={l} className="mb-2.5 last:mb-0">
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-[10.5px] font-medium">{l}</span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: "#4E8D6E" }}>{v}</span>
                      </div>
                      <div className="h-[5px] overflow-hidden rounded" style={{ background: "rgba(255,247,234,.08)" }}>
                        <div className="h-full rounded" style={{ width: `${w}%`, background: "linear-gradient(90deg,#FF5A47,#FFB09E)" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[12px] border p-4" style={{ background: "rgba(255,247,234,.05)", borderColor: "rgba(255,247,234,.09)" }}>
                  <div className="mb-0.5 flex items-baseline justify-between">
                    <div className="text-[11.5px] font-semibold">Répartition par thème</div>
                    <div className="font-mono text-[8.5px]" style={{ color: "rgba(255,247,234,.42)" }}>24 h</div>
                  </div>
                  <div className="mb-3 text-[9.5px]" style={{ color: "rgba(255,247,234,.42)" }}>La journée en pourcentages</div>
                  <div className="mb-3 flex h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,247,234,.06)" }}>
                    {[["#5566C7", 38], ["#C8663A", 27], ["#4E8D6E", 19], ["#B4568F", 11], ["rgba(255,247,234,.4)", 5]].map(([c, w], i) => (
                      <div key={i} className="h-full" style={{ width: `${w}%`, background: c }} />
                    ))}
                  </div>
                  {[["Data / IA", "#5566C7", "38%"], ["Ingénierie", "#C8663A", "27%"], ["Business", "#4E8D6E", "19%"], ["UX / Design", "#B4568F", "11%"]].map(([l, c, v]) => (
                    <div key={l} className="mb-1.5 flex items-center gap-2 last:mb-0">
                      <span className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
                      <span className="flex-1 text-[10.5px]">{l}</span>
                      <span className="text-[10.5px] font-bold tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[12px] p-4" style={{ background: CORAL, color: CREAM }}>
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Signaux faibles</div>
                    <div className="rounded-[20px] px-1.5 py-0.5 font-mono text-[8.5px] font-bold" style={{ background: INK, color: CREAM }}>03 · 30 j</div>
                  </div>
                  {["Voice-agents en apps mobiles grand public", "Green computing · efficacité carbone", "WCAG 3.0 · accessibilité graduée"].map((l) => (
                    <div key={l} className="flex items-start gap-2 border-t py-1.5" style={{ borderColor: "rgba(255,247,234,.24)" }}>
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold leading-none" style={{ background: INK, color: CREAM }}>↗</span>
                      <span className="text-[10px] font-medium leading-[1.35]">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-[12px] border p-4" style={{ background: "rgba(255,247,234,.05)", borderColor: "rgba(255,247,234,.09)" }}>
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <div className="text-[11.5px] font-semibold">Sources les plus actives</div>
                    <div className="font-mono text-[8.5px]" style={{ color: "rgba(255,247,234,.42)" }}>Top 5 · 24 h</div>
                  </div>
                  {[["The Batch", "#8E5FB8", "12"], ["Hacker News", "#C8663A", "9"], ["Sifted", "#4E8D6E", "8"], ["Latent Space", "#8E5FB8", "6"], ["CB Insights", "#4E8D6E", "5"]].map(([l, c, v]) => (
                    <div key={l} className="flex items-center justify-between border-t py-1.5 text-[10.5px]" style={{ borderColor: "rgba(255,247,234,.08)" }}>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /><b className="font-semibold">{l}</b></div>
                      <span className="text-[11px] font-bold tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 04 · Feature 04 — Mobile ── */}
      <section id="mobile" className="overflow-hidden border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="04" label="Feature 04" right="Ton brief, où que tu sois" accent />
          <div className="grid items-center gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="text-[clamp(40px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
                2 minutes le matin. Zéro FOMO.
              </h2>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6]" style={{ color: "rgba(26,10,8,.66)" }}>
                L&apos;app iOS et Android. Le brief arrive en notif à 07:00, tu le lis dans la file de la boulangerie, tu
                enregistres deux articles pour la pause de 11 h. C&apos;est tout.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={APP} className="inline-flex items-center gap-2.5 rounded-[14px] px-5 py-3.5 text-[13px] font-semibold" style={{ background: INK, color: CREAM, textDecoration: "none" }}>
                  <span className="text-[18px] leading-none"></span>
                  <span className="leading-tight"><span className="block text-[9px] font-normal" style={{ color: "rgba(255,247,234,.7)" }}>Télécharger sur</span>App Store</span>
                </a>
                <a href={APP} className="inline-flex items-center gap-2.5 rounded-[14px] px-5 py-3.5 text-[13px] font-semibold" style={{ background: INK, color: CREAM, textDecoration: "none" }}>
                  <span className="text-[16px] leading-none" style={{ color: CORAL }}>▶</span>
                  <span className="leading-tight"><span className="block text-[9px] font-normal" style={{ color: "rgba(255,247,234,.7)" }}>Disponible sur</span>Google Play</span>
                </a>
              </div>
              <div className="mt-6 flex items-center gap-3 text-[12.5px]" style={{ color: "rgba(26,10,8,.55)" }}>
                <div className="text-[14px] tracking-[0.1em]" style={{ color: CORAL }}>★★★★★</div>
                <span><b style={{ color: INK }}>4,9 / 5</b> · 320 avis · App Store FR</span>
              </div>
            </div>

            {/* phones */}
            <div className="flex justify-center gap-5">
              {[
                { rot: "rotate(-2deg)", label: "Le brief", z: 1, ty: 0 },
                { rot: "none", label: "Le fil", z: 2, ty: -16 },
                { rot: "rotate(2deg)", label: "L'article", z: 1, ty: 0 },
              ].map((p, i) => (
                <div key={i} className="hidden sm:block" style={{ transform: p.rot, transformOrigin: "center bottom", zIndex: p.z }}>
                  <div style={{ width: 230, height: 470, background: INK, borderRadius: 34, padding: 9, transform: `translateY(${p.ty}px)`, boxShadow: "0 30px 60px -20px rgba(26,10,8,.5)" }}>
                    <div className="relative h-full w-full overflow-hidden" style={{ background: CREAM, borderRadius: 26 }}>
                      <div className="absolute left-1/2 top-2 h-5 w-[70px] -translate-x-1/2 rounded-[20px]" style={{ background: INK, zIndex: 2 }} />
                      {i === 0 && <PhoneBrief />}
                      {i === 1 && <PhoneFeed />}
                      {i === 2 && <PhoneArticle />}
                    </div>
                  </div>
                  <div className="mt-3.5 text-center font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(26,10,8,.5)" }}>{p.label}</div>
                </div>
              ))}
              {/* mobile fallback: single phone */}
              <div className="sm:hidden" style={{ zIndex: 2 }}>
                <div style={{ width: 230, height: 470, background: INK, borderRadius: 34, padding: 9, boxShadow: "0 30px 60px -20px rgba(26,10,8,.5)" }}>
                  <div className="relative h-full w-full overflow-hidden" style={{ background: CREAM, borderRadius: 26 }}>
                    <div className="absolute left-1/2 top-2 h-5 w-[70px] -translate-x-1/2 rounded-[20px]" style={{ background: INK, zIndex: 2 }} />
                    <PhoneFeed />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 05 · Comparaison ── */}
      <section className="border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="05" label="Comparaison" right="Radar vs. ta veille actuelle" accent />
          <div className="mb-12 grid items-end gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <h2 className="text-[clamp(38px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
              Ce que Radar fait que ta stack actuelle ne fait pas.
            </h2>
            <p className="max-w-[560px] text-[17px] leading-[1.6]" style={{ color: "rgba(26,10,8,.66)" }}>
              Newsletters, RSS, X — chacun a ses forces. Aucun ne résume, ne croise, ne hiérarchise. Radar fait le job
              entier, tu récupères 3 h par semaine.
            </p>
          </div>
          <div className="overflow-x-auto rounded-[22px]" style={{ background: INK, boxShadow: "0 30px 60px -20px rgba(26,10,8,.25)" }}>
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-b" style={{ background: "rgba(255,247,234,.04)", borderColor: "rgba(255,247,234,.14)" }}>
                <div className="p-6" />
                <div className="p-5 text-center" style={{ background: CORAL, color: CREAM }}>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">Notre choix</div>
                  <div className="mt-1 text-[20px] font-bold tracking-[-0.015em]">Radar</div>
                </div>
                {[["Newsletters"], ["RSS / Feedly"], ["X / Twitter"]].map(([l]) => (
                  <div key={l} className="p-5 text-center" style={{ color: CREAM }}>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,247,234,.5)" }}>Habituel</div>
                    <div className="mt-1.5 text-[15px] font-semibold tracking-[-0.005em]">{l}</div>
                  </div>
                ))}
              </div>
              {[
                ["Résumé IA automatique", "✓", "—", "—", "—"],
                ["Sources croisées & dédoublonnées", "✓", "—", "manuel", "—"],
                ["Brief quotidien unique", "✓", "1 / source", "—", "—"],
                ["Signaux faibles détectés", "✓", "—", "—", "algo opaque"],
                ["Traduction en français", "✓", "—", "—", "—"],
                ["Zéro pub, zéro affilié", "✓", "—", "selon flux", "—"],
                ["Temps quotidien", "2 min", "30 min", "45 min", "illimité"],
                ["Coût mensuel", "0 – 7 €", "Gratuit", "0 – 12 €", "Gratuit"],
              ].map((row) => (
                <div key={row[0]} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-t" style={{ borderColor: "rgba(255,247,234,.08)" }}>
                  <div className="px-6 py-5 text-[14px] font-medium" style={{ color: CREAM }}>{row[0]}</div>
                  {row.slice(1).map((cell, ci) => {
                    const isRadar = ci === 0;
                    const check = cell === "✓";
                    const dash = cell === "—";
                    return (
                      <div
                        key={ci}
                        className="px-5 py-5 text-center"
                        style={isRadar ? { background: "linear-gradient(180deg,rgba(255,90,71,.18),rgba(255,90,71,.08))" } : undefined}
                      >
                        {dash ? (
                          <span className="inline-block h-0.5 w-5 rounded" style={{ background: "rgba(255,247,234,.18)" }} />
                        ) : check ? (
                          <span className="text-[18px] font-bold" style={{ color: CREAM }}>✓</span>
                        ) : (
                          <span
                            className="text-[13px]"
                            style={{ color: isRadar ? "#FFB09E" : cell === "manuel" || cell === "selon flux" || cell === "1 / source" || cell === "algo opaque" ? "#F2B03C" : "rgba(255,247,234,.85)", fontWeight: isRadar ? 700 : 500 }}
                          >
                            {cell}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 06 · Prix ── */}
      <section id="prix" className="border-b px-6 py-24 sm:px-14" style={{ background: "#F0E6D4", borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="06" label="Le prix" right="Deux plans · sans engagement" accent />
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1fr_1fr]">
            <div className="flex flex-col justify-between py-4">
              <h2 className="text-[clamp(40px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
                Un prix.<br />Un vrai.
              </h2>
              <p className="mt-5 max-w-[340px] text-[15px] leading-[1.6]" style={{ color: "rgba(26,10,8,.62)" }}>
                Radar reste gratuit pour les étudiants — parce qu&apos;apprendre à faire de la veille intelligente, ça se
                fait tôt.
              </p>
            </div>

            {/* Étudiant */}
            <div className="flex flex-col rounded-[22px] border p-9" style={{ background: "#fff", borderColor: "rgba(26,10,8,.1)" }}>
              <div className="mb-5 flex items-baseline justify-between">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">Étudiant</div>
                <div className="rounded-[20px] px-2.5 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background: "rgba(26,10,8,.06)", color: "rgba(26,10,8,.42)" }}>Free</div>
              </div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-[66px] font-bold leading-[0.9] tracking-[-0.035em]">0 €</span>
                <span className="text-[14px]" style={{ color: "rgba(26,10,8,.5)" }}>/ mois</span>
              </div>
              <div className="mb-6 text-[13px] leading-[1.5]" style={{ color: "rgba(26,10,8,.55)" }}>Sur email .edu · à vie tant que tu es étudiant.</div>
              <div className="mb-8 flex flex-1 flex-col gap-3">
                {["Brief quotidien complet, tous les matins", "Jusqu'à 25 sources personnalisées", "App iOS & Android", "Enregistrer, partager, exporter"].map((f) => (
                  <div key={f} className="flex items-start gap-3 text-[13.5px] leading-[1.5]"><span className="shrink-0 font-bold" style={{ color: "#4E8D6E" }}>✓</span><span>{f}</span></div>
                ))}
                <div className="flex items-start gap-3 text-[13.5px] leading-[1.5]" style={{ color: "rgba(26,10,8,.4)" }}><span className="shrink-0 font-bold" style={{ color: "rgba(26,10,8,.35)" }}>—</span><span>Tendances 30 j & signaux faibles</span></div>
              </div>
              <a href={APP} className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-[15px] text-[13.5px] font-semibold" style={{ borderColor: "rgba(26,10,8,.18)", color: INK, textDecoration: "none" }}>
                Commencer gratuitement <span className="text-[15px] leading-none">→</span>
              </a>
            </div>

            {/* Max */}
            <div className="relative flex flex-col overflow-hidden rounded-[22px] p-9" style={{ background: INK, color: CREAM }}>
              <div className="pointer-events-none absolute -right-10 -top-10 font-serif text-[220px] font-bold leading-[0.7] tracking-[-0.06em]" style={{ color: "rgba(255,90,71,.06)" }}>R</div>
              <div className="relative mb-5 flex items-baseline justify-between">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>Max</div>
                <div className="rounded-[20px] px-2.5 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background: CORAL, color: "#FFF6EA" }}>Populaire</div>
              </div>
              <div className="relative mb-2 flex items-baseline gap-2">
                <span className="text-[66px] font-bold leading-[0.9] tracking-[-0.035em]">7 €</span>
                <span className="text-[14px]" style={{ color: "rgba(255,247,234,.55)" }}>/ mois</span>
              </div>
              <div className="relative mb-6 text-[13px] leading-[1.5]" style={{ color: "rgba(255,247,234,.55)" }}>Facturé annuellement · 84 €/an</div>
              <div className="relative mb-8 flex flex-1 flex-col gap-3">
                {["Tout ce qui est dans Étudiant", "Sources illimitées · scraping premium", "Tendances 30 j & signaux faibles", "Alertes personnalisées & email digest", "Export PDF, Notion, Slack, Slides"].map((f) => (
                  <div key={f} className="flex items-start gap-3 text-[13.5px] leading-[1.5]"><span className="shrink-0 font-bold" style={{ color: "#5FAE8A" }}>✓</span><span>{f}</span></div>
                ))}
              </div>
              <a href={APP} className="relative inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-[15px] text-[13.5px] font-bold" style={{ background: CORAL, color: "#FFF6EA", textDecoration: "none" }}>
                Passer sur Max — 14 j offerts <span className="text-[15px] leading-none">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 07 · Étude de cas ── */}
      <section className="border-b px-6 py-20 sm:px-14" style={{ background: INK, color: CREAM, borderColor: "rgba(26,10,8,.15)" }}>
        <div className="mx-auto max-w-[1000px]">
          <ChapterHead n="07" label="Étude de cas" right="3 mois de Radar" dark accent />
          <h2 className="max-w-[820px] text-[clamp(36px,4.5vw,52px)] font-bold leading-[1.02] tracking-[-0.028em] [text-wrap:balance]">
            « J&apos;ai récupéré 4 h 30 par semaine. »
          </h2>
          <p className="mt-6 max-w-[640px] text-[17px] leading-[1.6]" style={{ color: "rgba(255,247,234,.68)" }}>
            Product designer chez Doctolib. 34 newsletters actives, 6 flux RSS, un compte Twitter jamais fermé — 45 min
            à trier chaque matin. Puis Radar.
          </p>
          <div className="mt-11 grid gap-px overflow-hidden rounded-[20px] sm:grid-cols-3" style={{ background: "rgba(255,247,234,.15)" }}>
            {[
              ["Avant", "45 min", "par matin · 5 j / 7", CREAM, INK, "rgba(255,247,234,.5)"],
              ["Après · avec Radar", "3 min", "brief lu au petit-déj", "#FFB09E", INK, CORAL],
              ["Gain hebdo", "4 h 30", "= 1 session Figma en plus", CREAM, "rgba(255,90,71,.14)", CORAL],
            ].map(([k, big, sub, bigColor, bg, kickColor]) => (
              <div key={k} className="p-8" style={{ background: bg }}>
                <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: kickColor }}>{k}</div>
                <div className="text-[44px] font-bold leading-none tracking-[-0.025em]" style={{ color: bigColor }}>{big}</div>
                <div className="mt-2.5 text-[13px]" style={{ color: "rgba(255,247,234,.72)" }}>{sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-5 rounded-[16px] border p-7" style={{ background: "rgba(255,247,234,.04)", borderColor: "rgba(255,247,234,.1)" }}>
            <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[16px] font-bold" style={{ background: CORAL, color: INK }}>SM</div>
            <div className="min-w-[200px] flex-1 text-[15px] italic leading-[1.55]" style={{ color: "rgba(255,247,234,.85)" }}>
              « La punchline de secours, c&apos;est ce qui m&apos;a convaincue. Je l&apos;ai sortie deux fois cette semaine en comité
              produit — on m&apos;a demandé où je lisais ça. Radar. »
            </div>
            <div className="shrink-0 font-serif text-[20px] font-bold tracking-[-0.01em]" style={{ color: "rgba(255,247,234,.4)" }}>Doctolib</div>
          </div>
        </div>
      </section>

      {/* ── Chapitre 08 · Témoignages ── */}
      <section className="border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="08" label="Ce qu'ils en disent" right="Beta · 320 utilisateurs actifs" accent />
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-[22px] p-11" style={{ background: CORAL, color: "#FFF6EA" }}>
              <div className="pointer-events-none absolute -top-6 right-9 font-serif text-[220px] font-bold leading-[0.7] tracking-[-0.05em]" style={{ color: "rgba(26,10,8,.09)" }}>&ldquo;</div>
              <div className="relative text-[26px] font-semibold leading-[1.3] tracking-[-0.01em] [text-wrap:balance]">
                Je passais 40 min chaque matin à faire ma veille. Je passe 2 min sur Radar. Le reste, c&apos;est du bonus.
              </div>
              <div className="relative mt-9 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full text-[14px] font-bold" style={{ background: "#FFF6EA", color: CORAL }}>SM</div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[14px] font-bold">Sarah M.</div>
                  <div className="text-[12px]" style={{ color: "rgba(255,246,234,.65)" }}>Product designer</div>
                </div>
                <div className="shrink-0 font-serif text-[20px] font-bold tracking-[-0.01em]" style={{ color: "rgba(255,246,234,.8)" }}>Doctolib</div>
              </div>
            </div>

            {[
              { q: "Le brief est devenu ma page d'accueil. La punchline, mon opener de réunion. Radar a remplacé Twitter dans ma journée.", n: "Léo P.", r: "CTO", co: "Payflow", c: "#4E8D6E" },
              { q: "J'ai enfin l'impression de savoir ce qui se passe sans dépendre de 20 newsletters. Le score de croisement, c'est du luxe.", n: "Manon B.", r: "VC analyst", co: "Serena", c: "#8E5FB8" },
            ].map((t) => (
              <div key={t.n} className="flex flex-col justify-between rounded-[22px] border p-9" style={{ background: "#fff", borderColor: "rgba(26,10,8,.1)" }}>
                <div className="text-[19px] font-medium leading-[1.4] tracking-[-0.005em] [text-wrap:balance]" style={{ color: INK }}>{t.q}</div>
                <div className="mt-7 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-bold" style={{ background: t.c, color: CREAM }}>{t.n.split(" ").map((w) => w[0]).join("")}</div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-bold">{t.n}</div>
                    <div className="text-[11.5px]" style={{ color: "rgba(26,10,8,.55)" }}>{t.r}</div>
                  </div>
                  <div className="shrink-0 text-[16px] font-bold tracking-[-0.015em]" style={{ color: "rgba(26,10,8,.4)" }}>{t.co}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chapitre 09 · FAQ ── */}
      <section id="faq" className="rad-faq border-b px-6 py-24 sm:px-14" style={{ background: CREAM, borderColor: "rgba(26,10,8,.08)" }}>
        <div className="mx-auto max-w-[1300px]">
          <ChapterHead n="09" label="FAQ" right="Les questions qu'on nous pose" />
          <div className="grid items-start gap-16 lg:grid-cols-[0.7fr_1.3fr]">
            <h2 className="text-[clamp(40px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">
              7 questions qui reviennent tout le temps.
            </h2>
            <div>
              {[
                ["Comment Radar choisit ce qui est important ?", "Trois signaux : la fraîcheur (récence), la vélocité (nombre de mentions dans les dernières 24 h) et la fiabilité (croisement entre sources indépendantes). On additionne, on pondère selon tes intérêts, on hiérarchise.", true],
                ["Est-ce qu'un LLM peut vraiment résumer un article correctement ?", "Oui, à condition de le brider. Radar utilise des résumés extractifs (les vraies phrases de l'article) plus une reformulation contrôlée. Zéro hallucination sur les chiffres, les noms propres restent verbatim.", false],
                ["Et si ma source n'est pas dans votre liste ?", "Tu la colles dans « Ajouter une source ». RSS, newsletter, blog, compte X, chaîne YouTube — Radar détecte le type et l'ajoute au flux en moins de 60 s.", false],
                ["Mes données sont-elles vendues ?", "Non, jamais. Radar est financé par ses abonnés (plan Max), pas par la revente de données. On n'a pas d'annonceurs, pas d'affiliés, pas de trackers tiers.", false],
                ["Puis-je résilier quand je veux ?", "Oui, en un clic depuis Paramètres. Aucune facture au-delà de la période en cours. Tes fiches enregistrées restent exportables 90 jours après résiliation.", false],
                ["Il y a une API ?", "Oui, disponible sur les plans Max et Enterprise. Endpoints REST pour récupérer le brief, le fil et les sources. Webhooks pour pousser les signaux vers Slack, Notion ou ton propre outil.", false],
                ["Et si une source ferme ou change d'URL ?", "Tu reçois une notification, et Radar te propose 2-3 alternatives couvrant le même terrain. Si l'URL a juste changé, on la met à jour automatiquement.", false],
              ].map(([q, a, open], i) => (
                <details key={i} className="border-t py-6 last:border-b" style={{ borderColor: "rgba(26,10,8,.15)" }} {...(open ? { open: true } : {})}>
                  <summary className="flex cursor-pointer items-baseline justify-between gap-5">
                    <span className="text-[clamp(18px,2vw,22px)] font-semibold leading-[1.3] tracking-[-0.012em] [text-wrap:balance]">{q}</span>
                    <span className="rad-plus shrink-0 font-sans text-[24px] font-bold" style={{ color: CORAL }}>+</span>
                  </summary>
                  <div className="mt-4 max-w-[700px] text-[15px] leading-[1.65]" style={{ color: "rgba(26,10,8,.65)" }}>{a}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden border-b px-6 py-28 text-center sm:px-14" style={{ background: CORAL, color: INK, borderColor: "rgba(26,10,8,.15)" }}>
        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 font-serif text-[clamp(180px,40vw,340px)] font-bold leading-[0.7] tracking-[-0.06em]" style={{ color: "rgba(26,10,8,.06)" }}>R</div>
        <div className="relative mx-auto max-w-[1100px]">
          <div className="mb-8 inline-flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#FFF6EA" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "#FFF6EA" }} />
            Envie de ne rien manquer ?
          </div>
          <h2 className="text-[clamp(48px,9vw,104px)] font-bold leading-[0.92] tracking-[-0.04em] [text-wrap:balance]" style={{ color: "#FFF6EA" }}>
            Radar lit tout, tu lis 2&nbsp;min.
          </h2>
          <p className="mx-auto mt-8 max-w-[640px] text-[19px] leading-[1.6]" style={{ color: "rgba(255,246,234,.75)" }}>
            14 jours gratuits sur Max. Aucune carte demandée. Le premier brief arrive demain 06:00.
          </p>
          <div className="mt-11 flex flex-wrap justify-center gap-3.5">
            <a href={APP} className="inline-flex items-center gap-3 rounded-full px-9 py-5 text-[16px] font-bold" style={{ background: INK, color: CREAM, textDecoration: "none", boxShadow: "0 18px 40px -18px rgba(26,10,8,.5)" }}>
              Créer mon Radar <span className="text-[19px] leading-none">→</span>
            </a>
            <a href="#brief" className="inline-flex items-center gap-2 rounded-full px-7 py-5 text-[15px] font-semibold" style={{ background: "rgba(26,10,8,.09)", color: "#FFF6EA", textDecoration: "none" }}>
              Voir un brief d&apos;exemple
            </a>
          </div>
          <div className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(26,10,8,.55)" }}>
            Gratuit pour les étudiants · sans engagement · résiliable en 1 clic
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 pb-11 pt-14 sm:px-14" style={{ background: INK, color: CREAM }}>
        <div className="mx-auto max-w-[1300px]">
          <div className="mb-11 grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <Radar size={32} dark />
                <div className="text-[20px] font-bold tracking-[-0.01em]">Radar</div>
              </div>
              <div className="max-w-[280px] text-[13px] leading-[1.6]" style={{ color: "rgba(255,247,234,.55)" }}>
                La veille tech, résumée et croisée automatiquement — pour arriver en réunion en sachant de quoi le monde
                parle.
              </div>
            </div>
            {[
              ["Produit", [["Le fil", "#produit"], ["Le brief", "#brief"], ["Tendances", "#produit"], ["Mobile", "#mobile"], ["Prix", "#prix"]]],
              ["Ressources", [["Le manifeste", APP], ["Changelog", APP], ["Guide de veille", APP], ["API", APP]]],
              ["Compte", [["Se connecter", APP], ["Créer un compte", APP], ["Support", APP], ["Statut", APP]]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <div className="mb-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: CORAL }}>{title as string}</div>
                <div className="flex flex-col gap-2.5 text-[13.5px]">
                  {(links as string[][]).map(([l, href]) => (
                    <a key={l} href={href} style={{ color: "rgba(255,247,234,.75)", textDecoration: "none" }}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-7 font-mono text-[11.5px] font-medium tracking-[0.06em]" style={{ borderColor: "rgba(255,247,234,.1)", color: "rgba(255,247,234,.4)" }}>
            <span>© {new Date().getFullYear()} Radar · Ed. Nº 187</span>
            <span>Fait à Bordeaux · avec de la caféine et 86 sources</span>
            <span>Mentions légales · Confidentialité</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Écrans téléphone (mobile mockups) ─────────────────────────────── */

function PhoneShell({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col px-4 pb-3.5 pt-8">{children}</div>;
}

function PhoneBrief() {
  return (
    <PhoneShell>
      <div className="mb-2.5 flex items-center justify-between font-mono text-[8.5px] font-semibold" style={{ color: "rgba(26,10,8,.5)" }}>
        <span>9:41</span><span>▂▄▆</span>
      </div>
      <div className="mb-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em]" style={{ color: CORAL }}>Brief · du jour</div>
      <div className="mb-3 text-[22px] font-bold leading-[1.02] tracking-[-0.02em]">Ce qui ressort du flux aujourd&apos;hui.</div>
      {[["01", "#8E5FB8", "Data", "Modèles < 3 B rattrapent GPT-4"], ["02", "#C8663A", "Tech", "WebAssembly norme du edge"], ["03", "#4E8D6E", "Business", "Agents = ½ des levées IA"]].map(([n, c, cat, t]) => (
        <div key={n} className="grid grid-cols-[34px_1fr] items-start gap-2.5 border-t py-2.5" style={{ borderColor: "rgba(26,10,8,.12)" }}>
          <div className="text-[30px] font-bold leading-[0.85] tracking-[-0.045em]" style={{ color: c }}>{n}</div>
          <div>
            <div className="mb-1 font-mono text-[7px] font-bold uppercase tracking-[0.1em]" style={{ color: c }}>{cat}</div>
            <div className="text-[11px] font-bold leading-[1.15] tracking-[-0.005em]">{t}</div>
          </div>
        </div>
      ))}
      <div className="mt-auto rounded-[9px] px-3 py-2.5" style={{ background: CORAL, color: "#FFF6EA" }}>
        <div className="mb-1 font-mono text-[7px] font-bold uppercase tracking-[0.1em]">Punchline</div>
        <div className="text-[9.5px] font-medium italic leading-[1.35]">« Qui capte la valeur des agents ? »</div>
      </div>
    </PhoneShell>
  );
}

function PhoneFeed() {
  return (
    <PhoneShell>
      <div className="mb-2.5 flex items-center justify-between font-mono text-[8.5px] font-semibold" style={{ color: "rgba(26,10,8,.5)" }}>
        <span>9:41</span><span>▂▄▆</span>
      </div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="h-[5px] w-[5px] rounded-full" style={{ background: CORAL, boxShadow: "0 0 0 3px rgba(255,90,71,.2)" }} />
        <span className="font-mono text-[7.5px] font-bold uppercase tracking-[0.12em]" style={{ color: CORAL }}>Le fil · Nº 187</span>
      </div>
      <div className="mb-2.5 text-[22px] font-bold leading-none tracking-[-0.02em]">Pour toi.</div>
      <div className="mb-2.5 flex items-center justify-between rounded-[8px] px-2.5 py-2" style={{ background: INK, color: CREAM }}>
        <div><div className="mb-0.5 font-mono text-[6.5px] font-bold uppercase tracking-[0.1em]" style={{ color: CORAL }}>Brief</div><div className="text-[10px] font-semibold">Voir en 2 min →</div></div>
        <div className="text-[10px]" style={{ color: CORAL }}>→</div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {[["#8E5FB8", "Data", "Modèles < 3 B rattrapent GPT-4", "The Batch · 2 h"], ["#C8663A", "Tech", "WebAssembly norme du edge", "Cloudflare · 4 h"], ["#4E8D6E", "Business", "Anthropic passe 100 M sans marketing", "Sifted · 4 h"]].map(([c, cat, t, meta]) => (
          <div key={t} className="rounded-[9px] border px-2.5 py-2.5" style={{ background: "#fff", borderColor: "rgba(26,10,8,.08)" }}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full" style={{ background: c }} />
              <span className="font-mono text-[6.5px] font-bold uppercase tracking-[0.09em]" style={{ color: c }}>{cat}</span>
            </div>
            <div className="text-[10px] font-bold leading-[1.15] tracking-[-0.005em]">{t}</div>
            <div className="mt-1 text-[8.5px]" style={{ color: "rgba(26,10,8,.5)" }}>{meta}</div>
          </div>
        ))}
      </div>
      <div className="mx-[-16px] mt-2.5 flex justify-between border-t px-4 pt-2.5 text-[9px] font-semibold" style={{ borderColor: "rgba(26,10,8,.1)", color: "rgba(26,10,8,.45)" }}>
        <span style={{ color: CORAL }}>Fil</span><span>Brief</span><span>Enreg.</span><span>Tend.</span>
      </div>
    </PhoneShell>
  );
}

function PhoneArticle() {
  return (
    <PhoneShell>
      <div className="mb-2.5 flex items-center justify-between font-mono text-[8.5px] font-semibold" style={{ color: "rgba(26,10,8,.5)" }}>
        <span>9:41</span><span>▂▄▆</span>
      </div>
      <div className="mb-3.5 flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(26,10,8,.55)" }}>
        <span className="font-medium">← Fil</span>
        <span className="ml-auto">↗ ★</span>
      </div>
      <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full px-2 py-1 font-mono text-[7.5px] font-bold uppercase tracking-[0.1em]" style={{ background: "rgba(200,102,58,.14)", color: "#C8663A" }}>
        <span className="h-1 w-1 rounded-full" style={{ background: "#C8663A" }} />Tech · Analyse
      </div>
      <div className="mb-3 text-[20px] font-bold leading-[1.05] tracking-[-0.02em]">WebAssembly devient la norme du edge.</div>
      <div className="mb-3.5 flex items-center gap-1.5 border-b pb-2.5 text-[9.5px]" style={{ borderColor: "rgba(26,10,8,.12)" }}>
        <div className="flex-1" style={{ color: "rgba(26,10,8,.55)" }}><b style={{ color: INK }}>Cloudflare</b> · 2 min · croisé 4×</div>
        <span className="text-[9px] font-bold" style={{ color: CORAL }}>Source →</span>
      </div>
      <div className="mb-1.5 font-mono text-[7px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(26,10,8,.45)" }}>Résumé Radar</div>
      <div className="mb-3 text-[10.5px] leading-[1.55]" style={{ color: "rgba(26,10,8,.82)" }}>
        Cloudflare, Fastly et Deno alignent leurs runtimes edge sur WebAssembly. Le format devient la seule cible portable multi-provider.
      </div>
      <div className="mb-2.5 flex gap-1.5 text-[9px] leading-[1.4]"><span className="font-bold" style={{ color: CORAL }}>→</span><span style={{ color: "rgba(26,10,8,.75)" }}>Portabilité edge sans lock-in</span></div>
      <div className="mt-auto rounded-[9px] px-3 py-2.5" style={{ background: INK, color: CREAM }}>
        <div className="mb-1 font-mono text-[6.5px] font-bold uppercase tracking-[0.1em]" style={{ color: CORAL }}>À ressortir</div>
        <div className="text-[9.5px] italic leading-[1.35]">« Une seule cible, tous les fournisseurs. »</div>
      </div>
    </PhoneShell>
  );
}
