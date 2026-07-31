#!/usr/bin/env node
/**
 * Bundle the Vercel serverless entry as ESM (.mjs) with workspace packages inlined.
 * Vercel treats api/*.js as CommonJS unless the repo root has "type": "module";
 * api/index.mjs is always loaded as ESM so `export default` works with hono/vercel.
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
  outfile: "api/index.mjs",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "bundle",
  external: runtimeExternals,
  logLevel: "info",
});

console.log(
  JSON.stringify({
    ok: true,
    outfile: "api/index.mjs",
    format: "esm",
    runtime_externals: runtimeExternals,
  })
);
