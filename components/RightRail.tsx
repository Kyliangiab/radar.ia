"use client";

import type { FluxView } from "@/lib/types";

/**
 * Rail droit "ambient" du design 4a (340px).
 * - fil / brief / enregistrés → mode "En direct" (radar animé + signaux + rituel)
 * - sources → statut de collecte + guide
 * Contenu volontairement ambient (le vrai temps réel viendra du pipeline).
 */
export function RightRail({
  flux,
  sourcesCount = 10,
  feedCount = 0,
}: {
  flux: FluxView;
  sourcesCount?: number;
  feedCount?: number;
}) {
  const isSources = flux === "sources";
  const isTrends = flux === "tendances";

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-[#F8EEDA] px-6 py-7 dark:bg-[#201A18]">
      {isSources ? (
        <>
          <section>
            <RailLabel dot="#4E8D6E">Statut de collecte</RailLabel>
            <div className="rounded-[14px] border border-border bg-card p-[18px_20px]">
              <div className="flex items-baseline justify-between">
                <div className="text-[32px] font-bold leading-none text-[#4E8D6E]">
                  {sourcesCount}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-foreground/40">
                  sources actives
                </div>
              </div>
              <div className="mt-2.5 text-[11.5px] leading-[1.5] text-foreground/55">
                Radar interroge ces sources en continu, dédoublonne et résume automatiquement.
              </div>
            </div>
          </section>
          <section>
            <RailLabel>Guide de la collecte</RailLabel>
            <div className="flex flex-col gap-2">
              {[
                ["Diversifie", "au moins 3 domaines pour éviter la chambre d'écho."],
                ["Croise", "3 sources par thème pour valider les signaux forts."],
                ["Mets en pause", "les sources bruyantes, sans les supprimer."],
              ].map(([b, t], i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-[11px] border border-border bg-card p-[11px_13px]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="text-[11.5px] leading-[1.5] text-foreground/80">
                    <b className="font-semibold text-foreground">{b}</b> — {t}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : isTrends ? (
        <>
          <section>
            <RailLabel dot="#FF5A47">Aperçu · 7 jours</RailLabel>
            <div className="rounded-[16px] bg-[#1A0A08] p-[22px] text-[#FFF7EA]">
              <div className="text-[46px] font-bold leading-none tracking-[-0.035em] text-primary">
                + 47 %
              </div>
              <div className="mt-2 text-[12px] leading-[1.45] text-[#FFF7EA]/60">
                de volume vs la semaine dernière — poussée surtout par les agents autonomes et l'edge.
              </div>
              <div className="mt-4 h-[60px]">
                <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="h-full w-full">
                  <path
                    d="M0 45 Q 25 40 40 38 T 80 30 T 120 24 T 160 14 T 200 6"
                    fill="none"
                    stroke="#FF5A47"
                    strokeWidth="2"
                  />
                  <path
                    d="M0 45 Q 25 40 40 38 T 80 30 T 120 24 T 160 14 T 200 6 L 200 60 L 0 60 Z"
                    fill="rgba(255,90,71,.15)"
                  />
                </svg>
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[8.5px] tracking-[0.06em] text-[#FFF7EA]/40">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            </div>
          </section>

          <section>
            <RailLabel>Comparer avec</RailLabel>
            <div className="flex flex-col gap-1.5">
              <button className="flex items-center gap-2.5 rounded-[11px] border border-border bg-card p-[11px_14px] text-left text-[12.5px] font-medium text-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#4E8D6E]" />
                <span className="flex-1">Semaine passée</span>
                <span className="font-mono text-[11px] font-bold text-[#4E8D6E]">actif</span>
              </button>
              {["Il y a un mois", "Il y a 3 mois"].map((p) => (
                <button
                  key={p}
                  className="flex items-center gap-2.5 rounded-[11px] border border-border bg-transparent p-[11px_14px] text-left text-[12.5px] font-medium text-foreground/70 hover:text-foreground"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/30" />
                  <span className="flex-1">{p}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-auto">
            <div className="rounded-[14px] bg-primary p-[16px_18px] text-[#FFF7EA]">
              <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#FFF7EA]/90">
                Lecture Radar
              </div>
              <div className="text-[12.5px] italic leading-[1.45] text-[#FFF7EA]">
                « La tendance de fond se lit sur plusieurs semaines, pas sur un pic. »
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section>
            <RailLabel dot="#4E8D6E" right={`${sourcesCount} sources`}>
              En direct
            </RailLabel>
            <RadarDisc />
            <div className="mt-3 text-[11.5px] leading-[1.55] text-foreground/55">
              {feedCount > 0 ? `${feedCount} articles dans ton fil` : "Flux synchronisé"} ·
              dédoublonnage automatique.
            </div>
          </section>

          <section>
            <RailLabel right="03">Signaux faibles</RailLabel>
            <div className="mb-2.5 rounded-[14px] bg-primary p-[14px_16px] text-white">
              <div className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/80">
                Détecté · UX
              </div>
              <div className="text-[12.5px] font-semibold leading-[1.35]">
                Les palettes désaturées remplacent le néon 2024
              </div>
              <div className="mt-2 text-[10.5px] italic text-white/85">+3× de mentions / 30 j</div>
            </div>
            {[
              "Le terme « SLM » apparaît dans 3× plus de sources qu'il y a un mois.",
              "Montée discrète des sujets « carbone par requête ».",
            ].map((s, i) => (
              <div
                key={i}
                className="mb-1.5 rounded-[12px] border border-border bg-card p-[11px_13px] text-[11.5px] leading-[1.4] text-foreground"
              >
                {s}
              </div>
            ))}
          </section>

          <section className="mt-auto">
            <div className="rounded-[14px] bg-foreground p-[16px_18px] text-background">
              <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-primary">
                Ton rituel
              </div>
              <div className="mb-1.5 text-[14px] font-semibold leading-[1.3]">
                Prochain brief demain 06:00
              </div>
              <div className="text-[11px] leading-[1.5] text-background/55">
                Notifié 5 min avant · reçu par email en parallèle.
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function RailLabel({
  children,
  dot,
  right,
}: {
  children: React.ReactNode;
  dot?: string;
  right?: string;
}) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      {dot && (
        <span
          className="h-2 w-2 animate-pulseDot rounded-full"
          style={{ background: dot }}
        />
      )}
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/70">
        {children}
      </span>
      {right && (
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.06em] text-foreground/45">
          {right}
        </span>
      )}
    </div>
  );
}

function RadarDisc() {
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-[16px]"
      style={{ background: "radial-gradient(circle at center,#241612 0%,#1A0A08 70%)" }}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(255,90,71,.18)" strokeWidth=".7" />
        <circle cx="100" cy="100" r="55" fill="none" stroke="rgba(255,90,71,.14)" strokeWidth=".7" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,90,71,.1)" strokeWidth=".7" />
        <line x1="100" y1="100" x2="200" y2="100" stroke="rgba(255,247,234,.06)" strokeWidth=".6" />
        <line x1="100" y1="100" x2="100" y2="200" stroke="rgba(255,247,234,.06)" strokeWidth=".6" />
        <line x1="100" y1="100" x2="0" y2="100" stroke="rgba(255,247,234,.06)" strokeWidth=".6" />
        <line x1="100" y1="100" x2="100" y2="0" stroke="rgba(255,247,234,.06)" strokeWidth=".6" />
        <g className="animate-sweep" style={{ transformOrigin: "100px 100px" }}>
          <defs>
            <linearGradient id="rgSweepRail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,90,71,0)" />
              <stop offset="100%" stopColor="#FF5A47" stopOpacity=".55" />
            </linearGradient>
          </defs>
          <path d="M100 100 L100 12 A88 88 0 0 1 188 100 Z" fill="url(#rgSweepRail)" />
        </g>
        <circle cx="100" cy="100" r="4" fill="#FF5A47" />
        <circle cx="138" cy="76" r="2.5" fill="#FF5A47" opacity=".9" />
        <circle cx="72" cy="132" r="2.5" fill="#FF5A47" opacity=".7" />
        <circle cx="150" cy="120" r="2" fill="#FF5A47" opacity=".55" />
        <circle cx="60" cy="80" r="2" fill="#FF5A47" opacity=".45" />
      </svg>
      <div className="absolute bottom-3 left-3.5 text-[#FFF7EA]">
        <div className="font-sans text-[20px] font-bold leading-none tracking-[-0.02em]">4 h 12</div>
        <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#FFF7EA]/55">
          Prochain digest
        </div>
      </div>
      <div className="absolute right-3.5 top-3 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#FFF7EA]/55">
        Balayage 04″
      </div>
    </div>
  );
}
