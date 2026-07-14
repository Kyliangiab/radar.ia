import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests unitaires (T11) : logique pure (url_canonical, parsing enrichissement,
// machine à états enrich_status) + gate du feed avec supabase mocké.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Résout les imports `@/...` comme le tsconfig (baseUrl racine).
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
