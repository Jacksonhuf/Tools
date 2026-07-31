#!/usr/bin/env node
/**
 * Bundle Vercel serverless entries:
 * - api/index.mjs: thin bootstrap (fast cold start + /api/v1/ping)
 * - api/bff-handler.mjs: full Hono BFF (lazy-loaded)
 */
import * as esbuild from "esbuild";

const runtimeExternals = [
  "hono",
  "hono/*",
  "@hono/node-server",
  "pg",
  "pg-native",
  "redis",
];

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "bundle",
  external: runtimeExternals,
  logLevel: "info",
};

await esbuild.build({
  ...shared,
  entryPoints: ["api/handler.ts"],
  outfile: "api/index.mjs",
  external: [...runtimeExternals, "./bff-handler.mjs"],
});

await esbuild.build({
  ...shared,
  entryPoints: ["api/bff-handler.ts"],
  outfile: "api/bff-handler.mjs",
});

console.log(
  JSON.stringify({
    ok: true,
    outfiles: ["api/index.mjs", "api/bff-handler.mjs"],
    format: "esm",
    runtime_externals: runtimeExternals,
  })
);
