"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("radar:theme", next);
    } catch {}
  }

  return (
    <div className="flex gap-0.5 rounded-[9px] bg-foreground/5 p-[3px]">
      {(
        [
          { id: "light", label: "Clair", Icon: Sun },
          { id: "dark", label: "Sombre", Icon: Moon },
        ] as const
      ).map(({ id, label, Icon }) => {
        const active = mounted && theme === id;
        return (
          <button
            key={id}
            onClick={() => apply(id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition-colors",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,.12)]"
                : "text-foreground/50 hover:text-foreground",
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
