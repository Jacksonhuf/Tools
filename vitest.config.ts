import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@mx-pricing/pricing-engine": resolve(
        __dirname,
        "packages/pricing-engine/src/index.ts"
      ),
      "@mx-pricing/i18n-format": resolve(
        __dirname,
        "packages/i18n-format/src/index.ts"
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "packages/**/src/**/*.test.ts"],
  },
});
