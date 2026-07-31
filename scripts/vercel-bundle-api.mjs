#!/usr/bin/env node
/**
 * Bundle the Vercel catch-all API handler (api/[...path].mjs).
 * Do not rewrite /api/* to /api — that strips the original path and breaks routing.
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
  entryPoints: ["api/bff-handler.ts"],
  outfile: "api/[...path].mjs",
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
    outfile: "api/[...path].mjs",
    format: "esm",
    runtime_externals: runtimeExternals,
  })
);
