/**
 * Tests unitaires de canonicalUrl — runner intégré `node:test` (aucune
 * dépendance ; vitest sera introduit en T11). Exécution : `npx tsx --test lib/url.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl } from "./url";

test("retire les paramètres de tracking utm_*, fbclid, ref", () => {
  assert.equal(
    canonicalUrl("https://example.com/a?utm_source=x&utm_medium=y&id=42"),
    "https://example.com/a?id=42",
  );
  assert.equal(canonicalUrl("https://example.com/a?fbclid=abc"), "https://example.com/a");
  assert.equal(canonicalUrl("https://example.com/a?ref=hn"), "https://example.com/a");
});

test("conserve les paramètres significatifs", () => {
  assert.equal(canonicalUrl("https://example.com/post?p=123"), "https://example.com/post?p=123");
});

test("retire le fragment #…", () => {
  assert.equal(canonicalUrl("https://example.com/a#section"), "https://example.com/a");
});

test("retire le/les slash(es) de fin", () => {
  assert.equal(canonicalUrl("https://example.com/a/"), "https://example.com/a");
  assert.equal(canonicalUrl("https://example.com/a///"), "https://example.com/a");
  // racine → host seul
  assert.equal(canonicalUrl("https://example.com/"), "https://example.com");
});

test("met le host en minuscules (chemin préservé, sensible à la casse)", () => {
  assert.equal(canonicalUrl("https://Example.COM/Path"), "https://example.com/Path");
});

test("cœur du bug : deux URLs de tracking d'un même article → même canonique", () => {
  const a = canonicalUrl("https://blog.dev/article?utm_source=twitter&utm_campaign=x");
  const b = canonicalUrl("https://blog.dev/article?fbclid=zzz#comments");
  const c = canonicalUrl("https://blog.dev/article/");
  assert.equal(a, "https://blog.dev/article");
  assert.equal(a, b);
  assert.equal(a, c);
});

test("idempotence : f(f(x)) === f(x)", () => {
  const once = canonicalUrl("https://Example.com/A/?utm_source=x#frag");
  assert.equal(canonicalUrl(once), once);
});

test("entrée non-URL absolue : fallback sans crash", () => {
  assert.equal(canonicalUrl("pas-une-url/Foo/#bar"), "pas-une-url/foo");
  assert.equal(canonicalUrl(""), "");
});
