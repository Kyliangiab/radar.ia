"use client";

import { Bookmark, Check } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RelevancePill } from "./RelevancePill";

// Fil de veille : liste dense titre + source. Le clic ouvre le panneau latéral
// (résumé) ; le bookmark enregistre sans l'ouvrir.
export function Feed({
  articles,
  savedSet,
  onOpen,
  onSave,
}: {
  articles: Article[];
  savedSet: Set<string>;
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      {articles.map((a) => (
        <Row
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

function Row({
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

  return (
    <div
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3.5 border-b border-border px-[18px] py-[13px] transition-colors last:border-b-0 hover:bg-foreground/[0.03]"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-[1.35] text-foreground">
          {a.title}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-foreground/45">
          <span className="font-medium text-foreground/60">{a.source}</span>
          <span> · {timeAgo(a.publishedAt)}</span>
        </div>
      </div>
      <RelevancePill score={a.heat} className="hidden shrink-0 sm:inline" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        aria-label={saved ? "Retirer des enregistrés" : "Enregistrer"}
        className={cn(
          "grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[8px] border transition-colors",
          saved
            ? "border-primary bg-primary text-white"
            : "border-border bg-transparent text-foreground/50 hover:text-foreground",
        )}
      >
        {saved ? <Check size={14} /> : <Bookmark size={14} />}
      </button>
    </div>
  );
}
