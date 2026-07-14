/**
 * Test du gate ADR-0005 sur GET /api/feed, sans DB réelle : on mocke
 * `@/lib/supabase` avec un query-builder qui enregistre les `.eq(...)`.
 * On vérifie que `enrich_status='ok'` est toujours appliqué et que `?uid=` est
 * ignoré (l'uid perso vient de la session Bearer, pas de l'URL — T9).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type Call = [string, string, unknown];

const h = vi.hoisted(() => {
  const calls: Call[] = [];
  const rows = [
    {
      id: "a1",
      title: "Titre",
      url: "https://x/a",
      source: "S",
      published_at: "2026-01-01T00:00:00Z",
      category: "tech",
      enrich_status: "ok",
    },
  ];
  let user: { id: string } | null = null;
  const builder = () => {
    const b = {
      select: () => b,
      order: () => b,
      eq: (c: string, v: unknown) => {
        calls.push(["eq", c, v]);
        return b;
      },
      is: (c: string, v: unknown) => {
        calls.push(["is", c, v]);
        return b;
      },
      limit: () => Promise.resolve({ data: rows, error: null }),
    };
    return b;
  };
  const client = {
    from: () => builder(),
    auth: { getUser: async () => ({ data: { user } }) },
  };
  return {
    calls,
    client,
    setUser: (u: { id: string } | null) => {
      user = u;
    },
    reset: () => {
      calls.length = 0;
      user = null;
    },
  };
});

vi.mock("@/lib/supabase", () => ({ getSupabase: () => h.client }));
vi.mock("@/lib/sources", () => ({ getFeed: async () => [] }));

import { GET } from "./route";

describe("GET /api/feed — gate enrich_status + uid session (ADR-0005 / T9)", () => {
  beforeEach(() => h.reset());

  it("applique toujours enrich_status='ok' et ignore ?uid= sans Bearer", async () => {
    const res = await GET(
      new Request("http://t/api/feed?category=all&uid=00000000-0000-0000-0000-000000000000"),
    );
    const json = await res.json();
    // Gate présent
    expect(h.calls).toContainEqual(["eq", "enrich_status", "ok"]);
    // ?uid= ignoré : aucune requête filtrée par user_id (pas de fuite du perso d'autrui)
    expect(h.calls.some((c) => c[0] === "eq" && c[1] === "user_id")).toBe(false);
    expect(json.source).toBe("db");
  });

  it("avec un Bearer valide, le feed perso vient de la session (eq user_id = uid session)", async () => {
    h.setUser({ id: "session-uid" });
    await GET(
      new Request("http://t/api/feed?category=all", {
        headers: { Authorization: "Bearer tok" },
      }),
    );
    expect(h.calls).toContainEqual(["eq", "enrich_status", "ok"]);
    expect(h.calls).toContainEqual(["eq", "user_id", "session-uid"]);
  });
});
