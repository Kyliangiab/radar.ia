/**
 * Tests unitaires de canonicalUrl (vitest). Exécution : `npm run test`.
 */
import { describe, it, expect } from "vitest";
import { canonicalUrl } from "./url";

describe("canonicalUrl", () => {
  it("retire les paramètres de tracking utm_*, fbclid, ref", () => {
    expect(canonicalUrl("https://example.com/a?utm_source=x&utm_medium=y&id=42")).toBe(
      "https://example.com/a?id=42",
    );
    expect(canonicalUrl("https://example.com/a?fbclid=abc")).toBe("https://example.com/a");
    expect(canonicalUrl("https://example.com/a?ref=hn")).toBe("https://example.com/a");
  });

  it("conserve les paramètres significatifs", () => {
    expect(canonicalUrl("https://example.com/post?p=123")).toBe("https://example.com/post?p=123");
  });

  it("retire le fragment #…", () => {
    expect(canonicalUrl("https://example.com/a#section")).toBe("https://example.com/a");
  });

  it("retire le/les slash(es) de fin", () => {
    expect(canonicalUrl("https://example.com/a/")).toBe("https://example.com/a");
    expect(canonicalUrl("https://example.com/a///")).toBe("https://example.com/a");
    expect(canonicalUrl("https://example.com/")).toBe("https://example.com");
  });

  it("met le host en minuscules (chemin préservé)", () => {
    expect(canonicalUrl("https://Example.COM/Path")).toBe("https://example.com/Path");
  });

  it("cœur du bug : deux URLs de tracking d'un même article → même canonique", () => {
    const a = canonicalUrl("https://blog.dev/article?utm_source=twitter&utm_campaign=x");
    const b = canonicalUrl("https://blog.dev/article?fbclid=zzz#comments");
    const c = canonicalUrl("https://blog.dev/article/");
    expect(a).toBe("https://blog.dev/article");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("idempotence : f(f(x)) === f(x)", () => {
    const once = canonicalUrl("https://Example.com/A/?utm_source=x#frag");
    expect(canonicalUrl(once)).toBe(once);
  });

  it("entrée non-URL absolue : fallback sans crash", () => {
    expect(canonicalUrl("pas-une-url/Foo/#bar")).toBe("pas-une-url/foo");
    expect(canonicalUrl("")).toBe("");
  });
});
