/**
 * Tests unitaires de l'enrichissement (vitest) : parsing pur + machine à états
 * ADR-0005. Aucune fonction réseau exercée.
 */
import { describe, it, expect } from "vitest";
import { parseEnrichment, decideOutcome } from "./enrich";

describe("parseEnrichment", () => {
  it("mappe un JSON valide (VO à null, ADR-0002)", () => {
    const e = parseEnrichment(
      {
        category: "data",
        summary: "Un résumé.",
        points: ["a", "b", "c", "d"],
        pullquote: "Une punchline",
        whyItMatters: "Pertinent.",
      },
      "tech",
    );
    expect(e.category).toBe("data");
    expect(e.summary).toBe("Un résumé.");
    expect(e.keyPoints).toEqual(["a", "b", "c"]); // arr3 : max 3
    expect(e.pullquote).toBe("Une punchline");
    expect(e.summaryOrig).toBeNull();
    expect(e.keyPointsOrig).toBeNull();
    expect(e.failReason).toBe("none");
  });

  it("catégorie invalide → fallback", () => {
    const e = parseEnrichment({ category: "sport" as never, summary: "x" }, "biz");
    expect(e.category).toBe("biz");
  });

  it("points non-tableau → keyPoints null", () => {
    const e = parseEnrichment({ category: "tech", points: "pas un tableau" }, "tech");
    expect(e.keyPoints).toBeNull();
  });

  it("parsed=null (pas de clé Groq) → failReason 'config', champs null", () => {
    const e = parseEnrichment(null, "ux");
    expect(e.category).toBe("ux");
    expect(e.summary).toBeNull();
    expect(e.failReason).toBe("config");
  });
});

describe("decideOutcome (machine à états ADR-0005)", () => {
  it("succès → ok, attempts inchangé", () => {
    expect(decideOutcome("résumé", "none", 1)).toEqual({ ok: true, attempts: 1, status: "ok" });
  });

  it("échec parse depuis 0 → pending, attempts 1", () => {
    expect(decideOutcome(null, "parse", 0)).toEqual({ ok: false, attempts: 1, status: "pending" });
  });

  it("échec http depuis 2 → failed (attempts 3)", () => {
    expect(decideOutcome(null, "http", 2)).toEqual({ ok: false, attempts: 3, status: "failed" });
  });

  it("429 ne consomme PAS de tentative (depuis 2 → reste pending 2)", () => {
    expect(decideOutcome(null, "rate429", 2)).toEqual({
      ok: false,
      attempts: 2,
      status: "pending",
    });
  });

  it("résumé fait d'espaces → traité comme échec", () => {
    expect(decideOutcome("   ", "none", 0)).toEqual({ ok: false, attempts: 1, status: "pending" });
  });
});
