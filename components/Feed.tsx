"use client";

import { Bookmark, Check } from "lucide-react";
import type { Article, CategoryId, Density } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo, hostOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RelevancePill } from "./RelevancePill";

// Fil de veille — deux densités (design 4a) :
// Confort = grille de cartes (bande dégradée + "Résumé Radar · via source"),
// Compact = liste dense. Un article ouvert est estompé (marqueur "lu").
export function Feed({
  articles,
  density = "confort",
  savedSet,
  readSet,
  onOpen,
  onSave,
}: {
  articles: Article[];
  density?: Density;
  savedSet: Set<string>;
  readSet?: Set<string>;
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const read = readSet ?? new Set<string>();

  if (density === "compact") {
    return (
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        {articles.map((a) => (
          <CompactRow
            key={a.id}
            a={a}
            saved={savedSet.has(a.id)}
            read={read.has(a.id)}
            onOpen={() => onOpen(a.id)}
            onSave={() => onSave(a.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
      {articles.map((a) => (
        <ConfortCard
          key={a.id}
          a={a}
          saved={savedSet.has(a.id)}
          read={read.has(a.id)}
          onOpen={() => onOpen(a.id)}
          onSave={() => onSave(a.id)}
        />
      ))}
    </div>
  );
}

function meta(a: Article) {
  const cat: CategoryId = (CATEGORY_MAP[a.category] ? a.category : "tech") as CategoryId;
  return {
    cat,
    color: categoryColor(cat),
    label: CATEGORY_MAP[cat]?.label ?? "Tech",
    tldr: a.summary || a.snippet || "",
    host: hostOf(a.url),
  };
}

function SaveBtn({
  saved,
  onSave,
  size = 30,
}: {
  saved: boolean;
  onSave: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSave();
      }}
      aria-label={saved ? "Retirer des enregistrés" : "Enregistrer"}
      className={cn(
        "grid shrink-0 place-items-center rounded-[9px] border transition-colors",
        saved
          ? "border-primary bg-primary text-white"
          : "border-border bg-transparent text-foreground/50 hover:text-foreground",
      )}
      style={{ height: size, width: size }}
    >
      {saved ? <Check size={size < 30 ? 13 : 15} /> : <Bookmark size={size < 30 ? 13 : 15} />}
    </button>
  );
}

function ConfortCard({
  a,
  saved,
  read,
  onOpen,
  onSave,
}: {
  a: Article;
  saved: boolean;
  read: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const { color, label, tldr, host } = meta(a);
  return (
    <article
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-border bg-card transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_34px_-18px_rgba(26,10,8,.28)]",
        read && "opacity-[0.62]",
      )}
    >
      {/* Bande dégradée par thème */}
      <div className="relative h-[104px]" style={{ background: `linear-gradient(135deg,${color},#1A0A08)` }}>
        {a.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : null}
        <span
          className="absolute left-3 top-3 rounded-full bg-[#FFF7EA]/92 px-[9px] py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.06em]"
          style={{ color }}
        >
          {label}
        </span>
        <span className="absolute right-3 top-3">
          <RelevancePill score={a.heat} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-[16px_18px_17px]">
        <div className="mb-2.5 flex items-center gap-[7px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-primary">
          <span>Résumé Radar</span>
          <span className="h-px w-3.5 bg-primary/50" />
          {host && <span className="truncate font-medium normal-case tracking-normal text-foreground/45">via {host}</span>}
          {read && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#4E8D6E]/15 px-2 py-0.5 text-[9px] text-[#4E8D6E]">
              ✓ Lu
            </span>
          )}
        </div>
        <h3 className="mb-1.5 line-clamp-2 text-[15px] font-bold leading-[1.28] tracking-[-0.008em] text-foreground">
          {a.title}
        </h3>
        {tldr && (
          <p className="line-clamp-2 text-[12.5px] leading-[1.55] text-foreground/60">{tldr}</p>
        )}
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5 text-[11px]">
          <span className="min-w-0 flex-1 truncate text-foreground/50">
            <b className="font-semibold text-foreground">{a.source}</b> · {timeAgo(a.publishedAt)}
          </span>
          <SaveBtn saved={saved} onSave={onSave} />
        </div>
      </div>
    </article>
  );
}

function CompactRow({
  a,
  saved,
  read,
  onOpen,
  onSave,
}: {
  a: Article;
  saved: boolean;
  read: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const { color, tldr } = meta(a);
  return (
    <div
      onClick={onOpen}
      className={cn(
        "flex cursor-pointer items-center gap-3.5 border-b border-border px-[18px] py-[13px] transition-colors last:border-b-0 hover:bg-foreground/[0.03]",
        read && "opacity-[0.62]",
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-[1.35] text-foreground">
          {a.title}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-foreground/45">
          {tldr ? tldr : (
            <>
              <span className="font-medium text-foreground/60">{a.source}</span>
              <span> · {timeAgo(a.publishedAt)}</span>
            </>
          )}
        </div>
      </div>
      <span className="hidden w-[120px] shrink-0 truncate text-right text-[11px] text-foreground/40 md:block">
        {a.source} · {timeAgo(a.publishedAt)}
      </span>
      <RelevancePill score={a.heat} className="hidden shrink-0 sm:inline" />
      <SaveBtn saved={saved} onSave={onSave} size={28} />
    </div>
  );
}
