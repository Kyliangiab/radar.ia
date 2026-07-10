"use client";

import { useEffect, useState } from "react";
import { subscribeToast, type ToastItem } from "@/lib/toast";

// Toast bas-centre, pill sombre animée (slide-up), auto-dismiss 2.6 s (design 4a).
export function Toaster() {
  const [t, setT] = useState<ToastItem | null>(null);

  useEffect(
    () =>
      subscribeToast((next) => {
        setT(next);
        setTimeout(() => setT((cur) => (cur && cur.id === next.id ? null : cur)), 2600);
      }),
    [],
  );

  return (
    <>
      <style>{`@keyframes radToast{from{transform:translate(-50%,30px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
      {t && (
        <div
          key={t.id}
          className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex items-center gap-2.5 rounded-full bg-[#1A0A08] px-5 py-3 text-[13px] font-medium text-[#FFF7EA] shadow-[0_16px_40px_-10px_rgba(26,10,8,.5)]"
          style={{ animation: "radToast .3s cubic-bezier(.34,1.56,.64,1)" }}
        >
          <span
            className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#1A0A08]"
            style={{ background: t.color }}
          >
            {t.icon}
          </span>
          {t.msg}
        </div>
      )}
    </>
  );
}
