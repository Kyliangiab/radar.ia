"use client";

import { Bookmark, Check } from "lucide-react";
import type { Article, CategoryId, Density } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo, hostOf } from "@/lib/format";
import { ArticleCard } from "./ArticleCard";
import { RelevancePill } from "./RelevancePill";

export function Feed({
  articles,
  density,
  savedSet,
  onOpen,
  onSave,
}: {
  articles: Article[];
  density: Density;
  savedSet: Set<string>;
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
}) {
  if (density === "compact") {
    return (
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        {articles.map((a) => (
          <CompactRow
            key={a.id}
            a={a}
            saved={savedSet.has(a.id)}
            onOpen={() => onOpen(a.id)}
            onSave={() => onSave(a.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 xl:grid-cols-3">
      {articles.map((a) => (
        <ArticleCard
          key={a.id}
          a={a}
          saved={savedSet.has(a.id)}
          onOpen={() => onOpen(a.id)}
          onSave={() => onSave(a.id)}
        />
      ))}
    </div>
  );
}

function CompactRow({
  a,
  saved,
  onOpen,
  onSave,
}: {
  a: Article;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const cat: CategoryId = (CATEGORY_MAP[a.category] ? a.category : "tech") as CategoryId;
  const color = categoryColor(cat);
  const tldr = a.summary || a.snippet || "";

  return (
    <div
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3.5 border-b border-border px-[18px] py-[13px] transition-colors last:border-b-0 hover:bg-foreground/[0.025]"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-[1.3] text-foreground">
          {a.title}
        </div>
        <div className="truncate text-[12px] text-foreground/50">{tldr}</div>
      </div>
      <span className="hidden w-[118px] shrink-0 truncate text-right text-[11px] text-foreground/40 md:block">
        {a.source} · {timeAgo(a.publishedAt)}
      </span>
      <RelevancePill score={a.heat} className="hidden shrink-0 sm:inline" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        aria-label={saved ? "Retirer des enregistrés" : "Enregistrer"}
        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] border transition-colors"
        style={
          saved
            ? { background: "#FF6B6A", borderColor: "#FF6B6A", color: "#fff" }
            : { background: "transparent", borderColor: "rgba(38,0,0,.16)", color: "rgba(38,0,0,.5)" }
        }
      >
        {saved ? <Check size={13} /> : <Bookmark size={13} />}
      </button>
    </div>
  );
}
