"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Clock,
  Flame,
  Compass,
  Layers,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import { BRAND, USER } from "@/config/brand";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

export type FeedSort = "foryou" | "recent" | "trending";

const FLUX: { id: FeedSort; label: string; icon: LucideIcon }[] = [
  { id: "foryou", label: "Pour toi", icon: Sparkles },
  { id: "recent", label: "Récents", icon: Clock },
  { id: "trending", label: "Tendances", icon: Flame },
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
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  category: CategoryId;
  onCategory: (c: CategoryId) => void;
  sort: FeedSort;
  onSort: (s: FeedSort) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  /** appelé après un clic (pour refermer le drawer mobile) */
  onNavigate?: () => void;
}) {
  const domains = CATEGORIES.filter((c) => c.id !== "all");

  return (
    <div className="flex h-full flex-col gap-4 p-3 text-sidebar-foreground">
      {/* En-tête : logo + nom + toggle */}
      <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5 pl-1">
            <Logo />
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-none tracking-tight">
                {BRAND.name}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">
                {BRAND.baseline}
              </p>
            </div>
          </div>
        )}
        {collapsed && <Logo />}
        {onToggle && (
          <button
            onClick={onToggle}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-white/15 hover:text-sidebar-foreground"
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            title={collapsed ? "Déplier" : "Replier"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      {/* Recherche (focus la barre du topbar) */}
      <RailItem
        collapsed={collapsed}
        icon={Search}
        label="Rechercher"
        onClick={() => {
          focusSearch();
          onNavigate?.();
        }}
      />

      {/* Flux */}
      <Section title="Flux" collapsed={collapsed}>
        {FLUX.map((f) => (
          <RailItem
            key={f.id}
            collapsed={collapsed}
            icon={f.icon}
            label={f.label}
            active={f.id === sort && category === "all"}
            onClick={() => {
              onSort(f.id);
              onCategory("all");
              onNavigate?.();
            }}
          />
        ))}
      </Section>

      {/* Domaines */}
      <Section title="Domaines" collapsed={collapsed}>
        {domains.map((c) => (
          <RailItem
            key={c.id}
            collapsed={collapsed}
            dot={c.color}
            label={c.label}
            active={c.id === category}
            onClick={() => {
              onCategory(c.id);
              onNavigate?.();
            }}
          />
        ))}
      </Section>

      {/* Explorer */}
      <Section title="Explorer" collapsed={collapsed}>
        <RailItem
          collapsed={collapsed}
          icon={Compass}
          label="Recherche sémantique"
          onClick={() => {
            focusSearch();
            onNavigate?.();
          }}
        />
        <RailItem
          collapsed={collapsed}
          icon={Layers}
          label="Sources"
          onClick={() => {
            scrollTo("sources");
            onNavigate?.();
          }}
        />
      </Section>

      {/* Compte (épinglé en bas, façon Claude) */}
      <div className="mt-auto">
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-white/15",
            collapsed && "justify-center",
          )}
          title={`${USER.name} · ${USER.plan}`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
            {USER.initials}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">
                  {USER.name}
                </span>
                <span className="block truncate text-[11px] text-sidebar-muted">{USER.plan}</span>
              </span>
              <ChevronsUpDown size={15} className="shrink-0 text-sidebar-foreground/70" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <nav className="space-y-1">
      {!collapsed && (
        <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">
          {title}
        </p>
      )}
      {children}
    </nav>
  );
}

function RailItem({
  label,
  icon: Icon,
  dot,
  active,
  collapsed,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  dot?: string;
  active?: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "h-9 w-9 justify-center p-0" : "px-2.5 py-2",
        active
          ? "bg-sidebar-accent text-primary shadow-sm"
          : "text-sidebar-foreground/90 hover:bg-white/15 hover:text-sidebar-foreground",
      )}
    >
      {dot ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/40"
          style={{ background: dot }}
        />
      ) : (
        Icon && <Icon size={17} className="shrink-0" />
      )}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
