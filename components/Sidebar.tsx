"use client";

import {
  Sparkles,
  Newspaper,
  Clock,
  Bookmark,
  TrendingUp,
  Rss,
  Check,
  type LucideIcon,
} from "lucide-react";
import { BRAND, USER } from "@/config/brand";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId, FluxView } from "@/lib/types";
import { cn } from "@/lib/utils";

const FLUX: { id: FluxView; label: string; icon: LucideIcon }[] = [
  { id: "pourtoi", label: "Pour toi", icon: Sparkles },
  { id: "brief", label: "Brief du jour", icon: Newspaper },
  { id: "recents", label: "Récents", icon: Clock },
  { id: "enregistres", label: "Enregistrés", icon: Bookmark },
  { id: "tendances", label: "Tendances", icon: TrendingUp },
];

export function Sidebar({
  flux,
  onFlux,
  domain,
  onDomain,
  savedCount,
  onNavigate,
}: {
  flux: FluxView;
  onFlux: (v: FluxView) => void;
  domain: CategoryId;
  onDomain: (c: CategoryId) => void;
  savedCount: number;
  onNavigate?: () => void;
}) {
  const domains = CATEGORIES.filter((c) => c.id !== "all");

  return (
    <div className="flex h-full flex-col bg-sidebar px-[15px] py-[22px] text-white">
      {/* Logo */}
      <div className="flex items-center gap-[11px] px-2 pb-6 pt-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-foreground">
          <span className="h-[13px] w-[13px] rounded-full border-[3px] border-sidebar" />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-bold leading-none">{BRAND.name}</div>
          <div className="mt-1 truncate text-[10.5px] tracking-[0.02em] text-white/70">
            veille tech · UI &amp; IA
          </div>
        </div>
      </div>

      {/* Mon flux */}
      <SectionLabel>Mon flux</SectionLabel>
      {FLUX.map((f) => (
        <NavItem
          key={f.id}
          icon={f.icon}
          label={f.label}
          active={flux === f.id}
          badge={f.id === "enregistres" && savedCount > 0 ? String(savedCount) : undefined}
          onClick={() => {
            onFlux(f.id);
            onNavigate?.();
          }}
        />
      ))}

      {/* Domaines */}
      <SectionLabel className="mt-5">Domaines</SectionLabel>
      {domains.map((d) => {
        const active = domain === d.id;
        return (
          <button
            key={d.id}
            onClick={() => {
              onDomain(d.id);
              onNavigate?.();
            }}
            className={cn(
              "mb-0.5 flex w-full items-center gap-[10px] rounded-[10px] px-3 py-[9px] text-left text-[13px] transition-colors",
              active
                ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(38,0,0,.12)]"
                : "font-medium text-white/85 hover:bg-white/10",
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/5"
              style={{ background: d.color }}
            />
            <span className="truncate">{d.label}</span>
            {active && <Check size={13} className="ml-auto shrink-0" style={{ color: d.color }} />}
          </button>
        );
      })}

      {/* Sources */}
      <button
        onClick={() => {
          onFlux("sources");
          onNavigate?.();
        }}
        className={cn(
          "mt-1 flex w-full items-center gap-[10px] rounded-[10px] px-3 py-[10px] text-left text-[13.5px] transition-colors",
          flux === "sources"
            ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(38,0,0,.12)]"
            : "font-medium text-white/85 hover:bg-white/10",
        )}
      >
        <Rss size={16} className="shrink-0" />
        <span>Sources</span>
      </button>

      {/* Compte */}
      <div className="mt-auto flex items-center gap-[11px] border-t border-white/25 px-2 pb-0.5 pt-3.5">
        <span className="grid h-[33px] w-[33px] shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
          {USER.initials}
        </span>
        <div className="min-w-0 leading-[1.25]">
          <div className="truncate text-[12.5px] font-semibold text-white">{USER.name}</div>
          <div className="truncate text-[10.5px] text-white/70">{USER.plan}</div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-2.5 mb-2 mt-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-white/65",
        className,
      )}
    >
      {children}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mb-[3px] flex w-full items-center gap-[10px] rounded-[10px] px-3 py-[10px] text-left text-[13.5px] transition-colors",
        active
          ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(38,0,0,.12)]"
          : "font-medium text-white/85 hover:bg-white/10",
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
      {badge && (
        <span
          className={cn(
            "ml-auto rounded-full px-[7px] py-px text-[10px] font-semibold",
            active ? "bg-foreground/10 text-foreground" : "bg-white/25 text-white",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
