"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Bookmark, Check, Share2, Loader2, ArrowUpRight } from "lucide-react";
import type { Article, CategoryId } from "@/lib/types";
import { categoryColor, CATEGORY_MAP } from "@/lib/categories";
import { timeAgo, hostOf } from "@/lib/format";
import { toast } from "@/lib/toast";
import { copyText } from "@/lib/share";
import { cn } from "@/lib/utils";
import { RelevancePill } from "./RelevancePill";

type Mode = "court" | "resume";
type Extra = { summary: string; points: string[]; pullquote: string };

// Heuristique légère : le texte est-il déjà en français ?
function isFrench(s: string): boolean {
  if (!s) return false;
  const t = " " + s.toLowerCase() + " ";
  const words = [" le ", " la ", " les ", " des ", " une ", " un ", " et ", " est ", " pour ", " avec ", " dans ", " sur ", " par ", " que ", " qui ", " aux ", " du "];
  let hits = /[éèêàçùâîô]/.test(s) ? 1 : 0;
  for (const w of words) if (t.includes(w)) hits++;
  return hits >= 2;
}

export function ArticleDrawer({
  article,
  saved,
  related = [],
  onClose,
  onSave,
}: {
  article: Article | null;
  saved: boolean;
  related?: Article[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [mode, setMode] = useState<Mode>("resume");
  const [askOpen, setAskOpen] = useState(false);
  const [askQ, setAskQ] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  // Langue : "vo" (langue d'origine) par défaut, "fr" à la demande. Le résumé
  // est stocké dans les 2 langues (summary_orig / summary) → bascule instantanée.
  // On ne traduit à la volée que le titre en FR (frMap) ; les points/punchline
  // sont générés dans la bonne langue (extra, via /api/summarize).
  const [lang, setLang] = useState<"vo" | "fr">("vo");
  const [frMap, setFrMap] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);
  const [extra, setExtra] = useState<{ en?: Extra; fr?: Extra }>({});
  // Animation entrée/sortie du tiroir.
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  // Swipe-pour-fermer (mobile) : on suit le doigt vers la droite.
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touch = useRef<{ x0: number; y0: number; swiping: boolean } | null>(null);

  // Fermeture animée : joue la sortie puis prévient le parent.
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x0: t.clientX, y0: t.clientY, swiping: false };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!touch.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x0;
    const dy = t.clientY - touch.current.y0;
    if (!touch.current.swiping) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        touch.current.swiping = true;
        setDragging(true);
      } else if (Math.abs(dy) > 10) {
        touch.current = null;
        return;
      } else return;
    }
    setDragX(Math.max(0, dx));
  }
  function onTouchEnd() {
    if (touch.current?.swiping) {
      if (dragX > 90) handleClose();
      else setDragX(0);
    }
    setDragging(false);
    touch.current = null;
  }

  // Reset + animation d'entrée + Échap, à chaque article.
  useEffect(() => {
    if (!article) return;
    setMode("resume");
    setAskOpen(false);
    setAskQ("");
    setAskAnswer("");
    setLang("vo");
    setFrMap({});
    setExtra({});
    setClosing(false);
    setEntered(false);
    setDragX(0);
    setDragging(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [article, handleClose]);

  const relatedCards = useMemo(
    () =>
      (related || [])
        .filter((r) => article && r.id !== article.id)
        .slice(0, 3),
    [related, article],
  );

  const langKey: "en" | "fr" = lang === "vo" ? "en" : "fr";

  // Traduction du TITRE en FR (le résumé est déjà stocké dans les 2 langues).
  useEffect(() => {
    if (!article || lang !== "fr" || isFrench(article.title)) return;
    const strings = [article.title, ...(mode === "court" ? [article.snippet ?? ""] : [])].filter(
      (s) => s && !(s in frMap),
    );
    const uniq = Array.from(new Set(strings));
    if (!uniq.length) return;
    let cancelled = false;
    setTranslating(true);
    // Timeout client : si la traduction traîne (> 12 s), on abandonne et on
    // garde le titre original — pas de spinner "Traduction…" figé.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: uniq, target: "français" }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.texts) || d.texts.length !== uniq.length) return;
        setFrMap((m) => {
          const n = { ...m };
          uniq.forEach((s, i) => (n[s] = d.texts[i]));
          return n;
        });
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setTranslating(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [article, lang, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Points + punchline générés dans la bonne langue (anglais en VO, français
  // en FR), directement à partir de la source → pas de re-traduction. Cache/lang.
  useEffect(() => {
    if (!article || extra[langKey]) return;
    let cancelled = false;
    fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        snippet: article.snippet ?? "",
        source: article.source,
        lang: langKey,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d || d.error) return;
        setExtra((e) => ({
          ...e,
          [langKey]: {
            summary: d.summary ?? "",
            points: (d.points ?? []).slice(0, 3),
            pullquote: d.pullquote ?? "",
          },
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [article, langKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!article) return null;
  const a = article;
  const origIsFrench = isFrench(a.title);
  const origLangLabel = origIsFrench ? "Français" : "English";

  // Affichage par langue — résumé stocké (instantané) ; repli sur le résumé
  // généré à la volée (extra, dans la bonne langue) puis sur l'extrait, pour ne
  // jamais afficher "pas de résumé" quand un article n'a pas été enrichi.
  const ex = extra[langKey];
  const displayTitle = lang === "fr" ? frMap[a.title] ?? a.title : a.title;
  // En VO on ne retombe PAS sur le résumé FR : summary_orig → résumé live (EN)
  // → extrait. En FR : summary → résumé live (FR) → extrait.
  const storedSummary = lang === "vo" ? a.summaryOrig ?? "" : a.summary ?? "";
  const courtOrig = a.snippet || "";
  const displayCourt = lang === "fr" ? frMap[courtOrig] ?? courtOrig : courtOrig;
  const displaySummary = storedSummary || ex?.summary || courtOrig || "";
  const body = mode === "court" ? displayCourt || displaySummary : displaySummary;
  // Points / punchline : uniquement les vrais (IA) — pas de fragments de phrase
  // qui ressemblent à un bug.
  const displayPoints = ex?.points?.length ? ex.points : [];
  const displayPullquote = ex?.pullquote || (lang === "fr" ? a.whyItMatters ?? "" : "");

  const cat: CategoryId = (CATEGORY_MAP[a.category] ? a.category : "tech") as CategoryId;
  const color = categoryColor(cat);
  const label = CATEGORY_MAP[cat]?.label ?? "Tech";
  const host = hostOf(a.url);

  async function ask(q: string) {
    const query = q.trim();
    if (!query) return;
    setAskQ(query);
    setAskLoading(true);
    setAskAnswer("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          source: a.source,
          snippet: a.snippet ?? "",
          summary: a.summary ?? "",
          question: query,
        }),
      });
      const d = await res.json();
      setAskAnswer(
        d?.answer ||
          `Radar n'a pas pu répondre pour l'instant. Ouvre la source (${a.source}) pour creuser.`,
      );
    } catch {
      setAskAnswer(`Réponse indisponible. Ouvre la source (${a.source}) pour creuser.`);
    } finally {
      setAskLoading(false);
    }
  }

  async function shareArticle() {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav?.share) {
      try {
        await nav.share({ title: a.title, url: a.url });
        return;
      } catch {
        /* annulé → repli copie */
      }
    }
    const ok = await copyText(a.url);
    toast(ok ? "Lien de l'article copié" : "Copie impossible", {
      icon: ok ? "✓" : "!",
      color: ok ? "#4E8D6E" : "#C8663A",
    });
  }

  const open = entered && !closing;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[#1A0A08]/60 backdrop-blur-[3px] transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={
          "absolute right-0 top-0 h-full w-[calc(100vw-30px)] max-w-[560px] overflow-y-auto rounded-l-[20px] bg-background p-[22px_28px_32px] shadow-[-24px_0_48px_-18px_rgba(26,10,8,.4)] sm:rounded-none" +
          (dragging ? "" : " transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]")
        }
        style={{ transform: open ? `translateX(${dragX}px)` : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center">
          <div className="flex items-center gap-2">
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
              {label}
            </span>
            <RelevancePill score={a.heat} className="ml-1" />
          </div>
          <button
            onClick={handleClose}
            aria-label="Fermer"
            className="ml-auto grid h-[30px] w-[30px] place-items-center rounded-full border border-border bg-card text-foreground/55 transition-colors hover:border-primary hover:text-primary"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="text-[11.5px] text-foreground/55">
            <b className="font-semibold text-foreground">{a.source}</b> · {timeAgo(a.publishedAt)}
            {a.points > 0 && <> · {a.points} pts</>}
          </div>
          {!origIsFrench && (
            <div className="flex shrink-0 gap-0.5 rounded-full bg-foreground/[0.06] p-[3px]">
              {(["vo", "fr"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] transition-colors",
                    lang === l ? "bg-primary text-white" : "text-foreground/55 hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <h2 className="mb-2.5 text-[21px] font-bold leading-[1.25] tracking-[-0.012em] text-foreground">
          {displayTitle}
        </h2>
        <div className="mb-[18px]">
          {!origIsFrench &&
            (lang === "fr" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4E8D6E]/[0.14] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[#4E8D6E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4E8D6E]" />
                {translating ? "Traduction…" : "Traduit par Radar"}
                {translating && <Loader2 size={10} className="animate-spin" />}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-foreground/50">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                Titre original · {origLangLabel}
              </span>
            ))}
        </div>

        {/* CTA Voir la source */}
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center gap-3 rounded-[12px] bg-[#1A0A08] p-[14px_18px] text-[#FFF7EA] shadow-[0_8px_20px_-8px_rgba(26,10,8,.35)] transition-transform hover:-translate-y-px"
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-primary text-[#1A0A08]">
            <ArrowUpRight size={17} />
          </span>
          <span className="min-w-0 flex-1 leading-[1.25]">
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
              Lire sur la source
            </span>
            <span className="block truncate text-[13px] font-semibold text-[#FFF7EA]">{host || a.source}</span>
          </span>
          <span className="text-[17px] font-bold text-primary">→</span>
        </a>

        {/* Actions */}
        <div className="mb-[22px] flex gap-2">
          <button
            onClick={onSave}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[9px] p-2.5 text-[12px] font-bold transition-colors",
              saved ? "bg-primary text-white" : "border border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {saved ? <Check size={15} /> : <Bookmark size={15} />}
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
          <button
            onClick={shareArticle}
            className="flex items-center justify-center gap-1.5 rounded-[9px] border border-border bg-card p-[10px_14px] text-[12px] font-semibold text-foreground hover:bg-muted"
          >
            <Share2 size={14} /> Partager
          </button>
        </div>

        {/* Résumé Radar + toggle */}
        <div className="mb-2.5 flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/40">
            Résumé Radar
          </span>
          <div className="ml-auto flex gap-0.5 rounded-[8px] bg-foreground/[0.06] p-[2px]">
            {(
              [
                { id: "court", label: "Court" },
                { id: "resume", label: "Résumé" },
              ] as { id: Mode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "rounded-[6px] px-[11px] py-[5px] font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] transition-colors",
                  mode === m.id ? "bg-foreground text-background" : "text-foreground/55 hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-[18px] text-[14px] leading-[1.65] text-foreground">
          {body || "Pas de résumé disponible — ouvre la source pour le détail."}
        </p>

        {/* 3 points */}
        {displayPoints.length > 0 && (
          <>
            <div className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/40">
              {displayPoints.length} points à retenir
            </div>
            {displayPoints.map((p, i) => (
              <div key={i} className="mb-2.5 flex gap-2.5 text-[13.5px] leading-[1.5] text-foreground/85">
                <span className="font-bold text-primary">→</span>
                <span>{p}</span>
              </div>
            ))}
          </>
        )}

        {/* À ressortir en réunion */}
        {displayPullquote && (
          <div className="mt-[18px] rounded-[13px] bg-[#1A0A08] p-[18px_20px]">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              À ressortir en réunion
            </div>
            <div className="text-[14.5px] italic leading-[1.45] text-[#FFF7EA]">« {displayPullquote} »</div>
          </div>
        )}

        {/* Aussi couvert par */}
        {relatedCards.length > 0 && (
          <div className="mt-[22px]">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/40">
                Aussi couvert par
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-primary">
                {relatedCards.length} sources
              </span>
            </div>
            {relatedCards.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-1.5 flex items-center gap-3 rounded-[11px] border border-border bg-card p-[11px_13px] transition-transform hover:translate-x-0.5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="min-w-0 flex-1 leading-[1.25]">
                  <span className="block truncate text-[12.5px] font-semibold text-foreground">{r.source}</span>
                  <span className="block truncate font-mono text-[10.5px] text-foreground/50">
                    {hostOf(r.url)} · {timeAgo(r.publishedAt)}
                  </span>
                </span>
                <span className="text-[14px] font-bold text-primary">→</span>
              </a>
            ))}
          </div>
        )}

        {/* Ask Radar */}
        {!askOpen ? (
          <button
            onClick={() => setAskOpen(true)}
            className="mt-[22px] flex w-full items-center gap-3 rounded-[13px] border border-dashed border-primary/40 bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] p-[14px_18px] text-left text-[13px] font-medium text-foreground transition-colors hover:border-primary"
          >
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary text-[14px] font-bold text-white">
              ?
            </span>
            <span className="flex-1">Poser une question à Radar sur cet article</span>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-primary">Ask IA</span>
          </button>
        ) : (
          <div className="mt-[22px] rounded-[14px] border border-primary/28 bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] p-[18px_20px]">
            <div className="mb-3 flex items-center">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                <span className="h-[6px] w-[6px] animate-pulseDot rounded-full bg-primary" />
                Radar répond · IA
              </div>
              <button onClick={() => setAskOpen(false)} className="ml-auto text-foreground/50 hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            {askLoading && (
              <div className="mb-3 flex items-center gap-2 rounded-[10px] bg-card p-[12px_14px] text-[12.5px] text-foreground/60">
                <Loader2 size={14} className="animate-spin text-primary" /> Radar réfléchit…
              </div>
            )}
            {askAnswer && (
              <div className="mb-3 rounded-[10px] bg-card p-[12px_14px] text-[13px] leading-[1.6] text-foreground">
                {askAnswer}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={askQ}
                onChange={(e) => setAskQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(askQ)}
                placeholder="Ex : Quel impact pour mon équipe ?"
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-[12.5px] text-foreground outline-none"
              />
              <button
                onClick={() => ask(askQ)}
                className="shrink-0 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
              >
                Demander →
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {["Impact pour mon équipe", "Chiffres clés", "Concurrents"].map((c) => (
                <button
                  key={c}
                  onClick={() => ask(c)}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-semibold text-foreground/70 hover:text-foreground"
                >
                  · {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[22px] inline-flex items-center gap-1.5 text-[12px] font-bold text-primary"
        >
          Voir l'article original →
        </a>
      </aside>
    </div>
  );
}
