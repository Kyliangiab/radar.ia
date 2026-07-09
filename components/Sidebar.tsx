"use client";

import { BRAND } from "@/config/brand";
import { CATEGORIES, RAMP } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { Logo } from "./Logo";

export type FeedSort = "foryou" | "recent" | "trending";

const FLUX: { id: FeedSort; label: string; icon: JSX.Element }[] = [
  { id: "foryou", label: "Pour toi", icon: <IconSparkle /> },
  { id: "recent", label: "Récents", icon: <IconClock /> },
  { id: "trending", label: "Tendances", icon: <IconFlame /> },
];

function focusSearch() {
  window.dispatchEvent(new CustomEvent("radar:focus-search"));
}
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Sidebar({
  category,
  onCategory,
  sort,
  onSort,
  onNavigate,
}: {
  category: CategoryId;
  onCategory: (c: CategoryId) => void;
  sort: FeedSort;
  onSort: (s: FeedSort) => void;
  /** appelé après un clic (pour refermer le drawer mobile) */
  onNavigate?: () => void;
}) {
  const domains = CATEGORIES.filter((c) => c.id !== "all");

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Logo + nom */}
      <div className="flex items-center gap-3 px-1">
        <Logo />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none tracking-tight">
            {BRAND.name}
          </p>
          <p className="mono-label mt-1 leading-none">{BRAND.baseline}</p>
        </div>
      </div>

      {/* CTA briefing */}
      <button
        onClick={() => {
          scrollTo("briefing");
          onNavigate?.();
        }}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/15 px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent/25"
      >
        <IconSpark /> Générer le briefing
      </button>

      {/* Flux */}
      <Section title="Flux">
        {FLUX.map((f) => (
          <NavItem
            key={f.id}
            active={f.id === sort && category === "all"}
            icon={f.icon}
            label={f.label}
            onClick={() => {
              onSort(f.id);
              onCategory("all");
              onNavigate?.();
            }}
          />
        ))}
      </Section>

      {/* Domaines */}
      <Section title="Domaines">
        {domains.map((c) => (
          <NavItem
            key={c.id}
            active={c.id === category}
            dot={c.color}
            label={c.label}
            onClick={() => {
              onCategory(c.id);
              onNavigate?.();
            }}
          />
        ))}
      </Section>

      {/* Explorer */}
      <Section title="Explorer">
        <NavItem
          icon={<IconSearch />}
          label="Recherche sémantique"
          onClick={() => {
            focusSearch();
            onNavigate?.();
          }}
        />
        <NavItem
          icon={<IconLayers />}
          label="Sources"
          onClick={() => {
            scrollTo("sources");
            onNavigate?.();
          }}
        />
      </Section>

      <div className="mt-auto px-1 pt-2">
        <p className="font-mono text-[11px] leading-relaxed text-faint">
          {BRAND.name} · {BRAND.maker}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav className="space-y-1">
      <p className="mono-label px-2 pb-1">{title}</p>
      {children}
    </nav>
  );
}

function NavItem({
  label,
  icon,
  dot,
  active,
  onClick,
}: {
  label: string;
  icon?: JSX.Element;
  dot?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent/15 text-ink"
          : "text-muted hover:bg-panel2 hover:text-ink"
      }`}
    >
      {dot ? (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
      ) : (
        <span className={`shrink-0 ${active ? "text-accent" : "text-faint"}`}>{icon}</span>
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ── Icônes (SVG inline, pas de dépendance) ── */
function IconSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.8 4.9L18.7 9.7 13.8 11.5 12 16.4 10.2 11.5 5.3 9.7 10.2 7.9z" fill="currentColor" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconFlame() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3c1 3-1 4-2 6a4 4 0 108 .5C18 6 14 5 12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l9 5-9 5-9-5 9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 13l9 5 9-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v6m0 8v6M2 12h6m8 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
