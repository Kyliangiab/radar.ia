/**
 * Test du gate ADR-0005 sur GET /api/feed, sans DB réelle : on mocke
 * `@/lib/supabase` avec un query-builder qui enregistre les `.eq(...)` / `.not(...)`.
 * On vérifie : (1) `enrich_status='ok'` toujours appliqué ; (2) `?uid=` ignoré
 * (l'uid perso vient de la session Bearer — T9) ; (3) une source archivée
 * (`user_source_prefs.removed=true`) est exclue du feed via `.not('source','in')`,
 * son id étant résolu en NOM (backlog#8).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type Call = [string, string, unknown];

const h = vi.hoisted(() => {
  const calls: Call[] = [];
  const articleRows = [
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
  // Données par table, paramétrables par test (prefs archivées + résolution nom).
  const data: {
    user_source_prefs: { source_id: string }[];
    sources: { name: string }[];
    user_sources: { name: string }[];
  } = { user_source_prefs: [], sources: [], user_sources: [] };

  // Builder chaînable ET thenable : `await builder` (requêtes prefs/sources/
  // user_sources sans `.limit`) résout `{data,error}` selon la table ; les
  // requêtes articles se terminent sur `.limit`.
  const builder = (table: string) => {
    const rows =
      table === "articles"
        ? articleRows
        : table === "user_source_prefs"
          ? data.user_source_prefs
          : table === "sources"
            ? data.sources
            : table === "user_sources"
              ? data.user_sources
              : [];
    const result = { data: rows, error: null };
    const b: any = {
      select: () => b,
      order: () => b,
      in: () => b,
      eq: (c: string, v: unknown) => {
        calls.push(["eq", c, v]);
        return b;
      },
      is: (c: string, v: unknown) => {
        calls.push(["is", c, v]);
        return b;
      },
      not: (c: string, op: string, v: unknown) => {
        calls.push(["not", `${c}.${op}`, v]);
        return b;
      },
      limit: () => Promise.resolve(result),
      // thenable : permet `await supabase.from(...).select(...).eq(...)`
      then: (resolve: (r: typeof result) => unknown) => resolve(result),
    };
    return b;
  };
  const client = {
    from: (table: string) => builder(table),
    auth: { getUser: async () => ({ data: { user } }) },
  };
  return {
    calls,
    client,
    setUser: (u: { id: string } | null) => {
      user = u;
    },
    setPrefs: (prefs: { source_id: string }[], sources: { name: string }[], userSources: { name: string }[]) => {
      data.user_source_prefs = prefs;
      data.sources = sources;
      data.user_sources = userSources;
    },
    reset: () => {
      calls.length = 0;
      user = null;
      data.user_source_prefs = [];
      data.sources = [];
      data.user_sources = [];
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
    // Pas de source archivée → aucun filtre d'exclusion
    expect(h.calls.some((c) => c[0] === "not")).toBe(false);
  });

  it("une source globale archivée (removed) est exclue du feed via .not('source','in', nom)", async () => {
    h.setUser({ id: "session-uid" });
    // L'utilisateur a archivé la source globale d'id 'devto' → nom 'Dev.to'.
    h.setPrefs([{ source_id: "devto" }], [{ name: "Dev.to" }], []);
    await GET(
      new Request("http://t/api/feed?category=all", {
        headers: { Authorization: "Bearer tok" },
      }),
    );
    // Exclusion par NOM résolu, sur la colonne texte `source`, via PostgREST not.in
    expect(h.calls).toContainEqual(["not", "source.in", '("Dev.to")']);
    // Le gate reste appliqué
    expect(h.calls).toContainEqual(["eq", "enrich_status", "ok"]);
  });
});
