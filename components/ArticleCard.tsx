"use client";

import { Bookmark, Check } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoverImage } from "./CoverImage";
import { RelevancePill } from "./RelevancePill";

export function ArticleCard({
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
  const label = CATEGORY_MAP[cat]?.label ?? "Tech";
  const tldr = a.summary || a.snippet || "";

  return (
    <article
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-border bg-card transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_34px_-14px_rgba(38,0,0,.26)]"
    >
      <div className="h-[152px] shrink-0">
        <CoverImage src={a.image} category={cat} source={a.source} />
      </div>

      <div className="flex flex-1 flex-col p-[16px_18px_17px]">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.03em]"
            style={{ color }}
          >
            {label}
          </span>
          <span className="text-[11px] text-foreground/40">· {timeAgo(a.publishedAt)}</span>
          <RelevancePill score={a.heat} className="ml-auto" />
        </div>

        <h3 className="mb-2 line-clamp-2 text-[15.5px] font-semibold leading-[1.3] text-foreground">
          {a.title}
        </h3>

        {tldr && (
          <p className="line-clamp-3 text-[12.5px] leading-[1.55] text-foreground/60">{tldr}</p>
        )}

        <div className="mt-auto flex items-center gap-2.5 pt-3.5">
          <span className="text-[12px] font-semibold text-primary">Lire le résumé →</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            aria-label={saved ? "Retirer des enregistrés" : "Enregistrer"}
            className={cn(
              "ml-auto grid h-[30px] w-[30px] place-items-center rounded-[9px] border transition-colors",
              saved
                ? "border-primary bg-primary text-white"
                : "border-border bg-transparent text-foreground/50 hover:text-foreground",
            )}
          >
            {saved ? <Check size={15} /> : <Bookmark size={15} />}
          </button>
        </div>
      </div>
    </article>
  );
}
