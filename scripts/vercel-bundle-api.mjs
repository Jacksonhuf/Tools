#!/usr/bin/env node
/**
 * Bundle the Vercel serverless entry as CommonJS with workspace packages inlined.
 * Vercel treats api/*.js as CJS unless the repo root has "type": "module"; ESM output
 * caused FUNCTION_INVOCATION_FAILED. Heavy runtime deps stay external (hono, pg, redis).
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

await esbuild.build({
  entryPoints: ["api/handler.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  packages: "bundle",
  external: runtimeExternals,
  logLevel: "info",
});

console.log(
  JSON.stringify({
    ok: true,
    outfile: "api/index.js",
    format: "cjs",
    runtime_externals: runtimeExternals,
  })
);
