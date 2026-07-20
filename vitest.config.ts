import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@mx-pricing/pricing-engine": resolve(
        __dirname,
        "packages/pricing-engine/src/index.ts"
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "packages/**/src/**/*.test.ts"],
  },
});
