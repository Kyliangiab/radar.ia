import type { Config } from "tailwindcss";

/**
 * Design tokens "Radar" — canvas indigo sombre (façon daily.dev).
 * Les deux accents (--accent / --hot) sont pilotés par des variables CSS
 * dans app/globals.css : change-les là pour rethemer toute l'app.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0F1117",
        panel: "#171A21",
        panel2: "#1E222C",
        line: "#262B36",
        ink: "#E8EAF0",
        muted: "#9AA3B2",
        faint: "#646C7E",
        accent: "rgb(var(--accent) / <alpha-value>)",
        hot: "rgb(var(--hot) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 30px -18px rgba(0,0,0,0.7)",
        glow: "0 0 0 1px rgb(var(--accent) / 0.35), 0 0 24px -6px rgb(var(--accent) / 0.35)",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        sweep: "sweep 4s linear infinite",
        rise: "rise 0.4s ease-out both",
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
