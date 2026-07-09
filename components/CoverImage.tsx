"use client";

import { useState } from "react";
import type { CategoryId } from "@/lib/types";

// Dégradés de placeholder par domaine (palette Marple) — pour garder un feed
// "image-rich" façon daily.dev même quand la source n'a pas d'illustration.
const GRADIENT: Record<CategoryId, string> = {
  all: "linear-gradient(135deg,#FF6B6A 0%,#C8663A 100%)",
  tech: "linear-gradient(135deg,#C8663A 0%,#8a4225 100%)",
  biz: "linear-gradient(135deg,#4E8D6E 0%,#356048 100%)",
  data: "linear-gradient(135deg,#5566C7 0%,#3a458a 100%)",
  ux: "linear-gradient(135deg,#B4568F 0%,#7c3a61 100%)",
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
    <div className="relative h-full min-h-[120px] w-full overflow-hidden bg-muted">
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
