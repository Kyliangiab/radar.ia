import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import { BRAND } from "@/config/brand";
import "./globals.css";

// Poppins — police principale (titres + corps).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Monospace — petites étiquettes techniques.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.baseline}`,
  description: BRAND.intro,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${poppins.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
