"use client";

import type { Briefing } from "./types";

/**
 * Partage réel du brief du jour.
 * Pas de webhook Slack configuré → Slack passe par le presse-papier (texte
 * formaté prêt à coller). Email = mailto: (ouvre le client). PDF = fenêtre
 * d'impression (Enregistrer au format PDF). Tout fonctionne sans dépendance.
 */

export type BriefNumber = { value: string; unit: string; label: string };

const dateLabel = () =>
  new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/** Digest texte brut — utilisé pour le presse-papier, Slack et l'email. */
export function briefToText(b: Briefing, numbers: BriefNumber[]): string {
  const lines: string[] = [];
  lines.push(`RADAR · Brief du jour — ${dateLabel()}`);
  lines.push("");
  if (b.headline) lines.push(`« ${b.headline} »`);
  lines.push("");
  lines.push("3 choses à retenir :");
  b.trends.slice(0, 3).forEach((t, i) => {
    lines.push(`${i + 1}. ${t.title}`);
    if (t.why) lines.push(`   ${t.why}`);
  });
  if (b.watch) {
    lines.push("");
    lines.push(`À surveiller : ${b.watch}`);
  }
  if (numbers.length) {
    lines.push("");
    lines.push("Les chiffres du jour :");
    lines.push(numbers.map((n) => `${n.value}${n.unit} ${n.label}`).join(" · "));
  }
  lines.push("");
  lines.push(typeof window !== "undefined" ? window.location.href : "");
  return lines.join("\n").trim();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Ouvre le client mail avec le brief pré-rempli. */
export function emailBrief(b: Briefing, numbers: BriefNumber[]): void {
  const subject = `Radar · Brief du jour — ${dateLabel()}`;
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    briefToText(b, numbers),
  )}`;
  window.location.href = url;
}

/** Ouvre une fenêtre imprimable propre → l'utilisateur enregistre en PDF. */
export function printBrief(b: Briefing, numbers: BriefNumber[]): void {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trends = b.trends
    .slice(0, 3)
    .map(
      (t, i) =>
        `<li><b>${String(i + 1).padStart(2, "0")} — ${esc(t.title)}</b><br/><span>${esc(
          t.why ?? "",
        )}</span></li>`,
    )
    .join("");
  const nums = numbers
    .map((n) => `<div class="num"><span class="v">${esc(n.value)}${esc(n.unit)}</span><span class="l">${esc(n.label)}</span></div>`)
    .join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
<title>Radar · Brief du jour</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A0A08;max-width:720px;margin:40px auto;padding:0 28px;line-height:1.6}
  .kicker{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#FF5A47;font-weight:700}
  h1{font-size:30px;line-height:1.15;letter-spacing:-.02em;margin:6px 0 4px}
  .headline{font-style:italic;font-size:17px;color:#4a3a36;margin:14px 0 24px}
  ol{list-style:none;padding:0;margin:0}
  li{border-top:1px solid #eaddc9;padding:16px 0}
  li b{font-size:17px}li span{color:#5a4a45;font-size:14px}
  .nums{display:flex;flex-wrap:wrap;gap:24px;background:#1A0A08;color:#FFF7EA;border-radius:14px;padding:22px 26px;margin:24px 0}
  .num .v{display:block;font-size:34px;font-weight:800;letter-spacing:-.03em}
  .num .l{display:block;font-size:12px;opacity:.6;margin-top:4px}
  .watch{background:#fff2ef;border:1px solid #ffcfc6;border-radius:12px;padding:16px 18px;font-size:14px}
  footer{margin-top:28px;font-size:11px;color:#9a8a85}
</style></head><body>
  <div class="kicker">Radar · Brief du jour</div>
  <h1>Ce qui ressort du flux aujourd'hui</h1>
  <div style="font-size:12px;color:#9a8a85">${dateLabel()}</div>
  ${b.headline ? `<p class="headline">« ${esc(b.headline)} »</p>` : ""}
  <ol>${trends}</ol>
  <div class="nums">${nums}</div>
  ${b.watch ? `<div class="watch"><b>À surveiller —</b> ${esc(b.watch)}</div>` : ""}
  <footer>Généré par Radar · veille technologique auto-alimentée</footer>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
