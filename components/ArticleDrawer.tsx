"use client";

import { X, ExternalLink, Bookmark, Check } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RelevancePill } from "./RelevancePill";

// Panneau latéral : le résumé IA + "pourquoi ça compte", puis on laisse le user
// ouvrir l'article. Le feed reste minimal (titre + source).
export function ArticleDrawer({
  article,
  saved,
  onClose,
  onSave,
}: {
  article: Article | null;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!article) return null;
  const a = article;
  const cat: CategoryId = (CATEGORY_MAP[a.category] ? a.category : "tech") as CategoryId;
  const color = categoryColor(cat);
  const label = CATEGORY_MAP[cat]?.label ?? "Tech";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.03em]"
            style={{ color }}
          >
            {label}
          </span>
          <RelevancePill score={a.heat} className="ml-1" />
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-foreground/50 hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h2 className="mb-2 text-[19px] font-bold leading-[1.3] text-foreground">{a.title}</h2>
          <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[12px] text-foreground/45">
            <span className="font-medium text-foreground/60">{a.source}</span>
            <span>· {timeAgo(a.publishedAt)}</span>
            {a.points > 0 && <span>· {a.points} pts</span>}
          </div>

          {a.summary ? (
            <>
              <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.07em] text-foreground/40">
                Résumé
              </div>
              <p className="mb-5 text-[14px] leading-[1.6] text-foreground/80">{a.summary}</p>
            </>
          ) : a.snippet ? (
            <p className="mb-5 text-[14px] leading-[1.6] text-foreground/70">{a.snippet}</p>
          ) : (
            <p className="mb-5 text-[13px] italic text-foreground/45">
              Pas de résumé disponible pour cet article.
            </p>
          )}

          {a.whyItMatters && (
            <div
              className="mb-5 rounded-[14px] p-[16px_18px]"
              style={{ background: "rgba(255,90,71,.1)", border: "1px solid rgba(255,90,71,.25)" }}
            >
              <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[#E0503F]">
                Pourquoi ça compte
              </div>
              <p className="text-[13.5px] leading-[1.5] text-foreground/85">{a.whyItMatters}</p>
            </div>
          )}

          {a.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {a.tags.slice(0, 6).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] text-foreground/55"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary/90"
          >
            Lire l'article <ExternalLink size={15} />
          </a>
          <button
            onClick={onSave}
            aria-label={saved ? "Retirer des enregistrés" : "Enregistrer"}
            className={cn(
              "grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border transition-colors",
              saved
                ? "border-primary bg-primary text-white"
                : "border-border text-foreground/55 hover:text-foreground",
            )}
          >
            {saved ? <Check size={18} /> : <Bookmark size={18} />}
          </button>
        </div>
      </aside>
    </div>
  );
}
