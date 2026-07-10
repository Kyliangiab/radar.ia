"use client";

import { useState } from "react";
import {
  Sparkles,
  Newspaper,
  Bookmark,
  Rss,
  Check,
  LogOut,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { CATEGORIES, RAMP } from "@/lib/categories";
import type { CategoryId, FluxView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

export interface AccountUser {
  name: string;
  initials: string;
  email?: string;
  plan?: string;
}

const FLUX: { id: FluxView; label: string; icon: LucideIcon }[] = [
  { id: "fil", label: "Pour toi", icon: Sparkles },
  { id: "brief", label: "Brief du jour", icon: Newspaper },
  { id: "enregistres", label: "Enregistrés", icon: Bookmark },
];

const pad2 = (n: number) => (n < 10 ? "0" : "") + n;

export function Sidebar({
  flux,
  onFlux,
  domain,
  onDomain,
  savedCount,
  domainCounts,
  sourcesCount,
  user,
  onLogout,
  onNavigate,
}: {
  flux: FluxView;
  onFlux: (v: FluxView) => void;
  domain: CategoryId;
  onDomain: (c: CategoryId) => void;
  savedCount: number;
  domainCounts?: Partial<Record<CategoryId, number>>;
  sourcesCount?: number;
  user: AccountUser;
  onLogout?: () => void;
  onNavigate?: () => void;
}) {
  const domains = CATEGORIES.filter((c) => c.id !== "all");
  const [menuOpen, setMenuOpen] = useState(false);
  const total = Object.values(domainCounts ?? {}).reduce((s, n) => s + (n ?? 0), 0);

  return (
    <div className="flex h-full flex-col bg-sidebar px-[15px] py-[22px] text-white">
      {/* Logo */}
      <div className="flex items-center gap-[11px] px-2 pb-6 pt-1">
        <Logo size={36} />
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
      <DomainItem
        label="Tous"
        gradient
        count={domainCounts ? pad2(total) : undefined}
        active={domain === "all"}
        onClick={() => {
          onDomain("all");
          onNavigate?.();
        }}
      />
      {domains.map((d) => (
        <DomainItem
          key={d.id}
          label={d.label}
          color={d.color}
          count={domainCounts ? pad2(domainCounts[d.id] ?? 0) : undefined}
          active={domain === d.id}
          onClick={() => {
            onDomain(d.id);
            onNavigate?.();
          }}
        />
      ))}

      {/* Sources */}
      <button
        onClick={() => {
          onFlux("sources");
          onNavigate?.();
        }}
        className={cn(
          "mt-1 flex w-full items-center gap-[10px] rounded-[10px] px-3 py-[10px] text-left text-[13.5px] transition-colors",
          flux === "sources"
            ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(26,10,8,.12)]"
            : "font-medium text-white/85 hover:bg-white/10",
        )}
      >
        <Rss size={16} className="shrink-0" />
        <span>Sources{sourcesCount ? ` · ${sourcesCount}` : ""}</span>
      </button>

      {/* Compte */}
      <div className="relative mt-auto border-t border-white/25 pt-3.5">
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg">
            {user.email && (
              <div className="border-b border-border px-3.5 py-2.5">
                <div className="truncate text-[12px] font-semibold">{user.name}</div>
                <div className="truncate text-[11px] text-foreground/50">{user.email}</div>
              </div>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout?.();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-[11px] rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/10"
        >
          <span className="grid h-[33px] w-[33px] shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1 leading-[1.25]">
            <div className="truncate text-[12.5px] font-semibold text-white">{user.name}</div>
            <div className="truncate text-[10.5px] text-white/70">
              {user.plan ?? user.email ?? "Plan Max"}
            </div>
          </div>
          <ChevronDown
            size={15}
            className={cn("shrink-0 text-white/50 transition-transform", menuOpen && "rotate-180")}
          />
        </button>
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

function DomainItem({
  label,
  color,
  gradient,
  count,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  gradient?: boolean;
  count?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "mb-0.5 flex w-full items-center gap-[10px] rounded-[10px] px-3 py-[9px] text-left text-[13px] transition-colors",
        active
          ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(26,10,8,.12)]"
          : "font-medium text-white/85 hover:bg-white/10",
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/5"
        style={{ background: gradient ? RAMP : color }}
      />
      <span className="truncate">{label}</span>
      {count && (
        <span
          className={cn(
            "ml-auto font-mono text-[10.5px] tracking-[0.04em]",
            active ? "text-foreground/50" : "text-white/40",
          )}
        >
          {count}
        </span>
      )}
      {active && (
        <Check
          size={13}
          className={cn("shrink-0", count ? "ml-1.5" : "ml-auto")}
          style={{ color: gradient ? "#FF5A47" : color }}
        />
      )}
    </button>
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
          ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgba(26,10,8,.12)]"
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
