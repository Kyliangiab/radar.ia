"use client";

import { useState } from "react";
import type { CategoryId } from "@/lib/types";

// Dégradés de placeholder par domaine (palette Marple) — pour garder un feed
// "image-rich" façon daily.dev même quand la source n'a pas d'illustration.
const GRADIENT: Record<CategoryId, string> = {
  all: "linear-gradient(135deg,#E35C2B 0%,#FFB200 100%)",
  tech: "linear-gradient(135deg,#E35C2B 0%,#8A2E12 100%)",
  biz: "linear-gradient(135deg,#FFB200 0%,#E35C2B 100%)",
  data: "linear-gradient(135deg,#8A2E12 0%,#3a1206 100%)",
  ux: "linear-gradient(135deg,#C98A3C 0%,#8a5a24 100%)",
};

export function CoverImage({
  src,
  category,
  source,
}: {
  src?: string;
  category: CategoryId;
  source: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = src && !broken;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className="flex h-full w-full items-end p-3"
          style={{ background: GRADIENT[category] ?? GRADIENT.all }}
          aria-hidden="true"
        >
          <span className="rounded-md bg-black/35 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
            {source}
          </span>
        </div>
      )}
    </div>
  );
}
