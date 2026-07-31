#!/usr/bin/env node
/**
 * Bundle the Vercel API entry (api/index.mjs) exporting the Hono app directly.
 * vercel.json rewrites /api/* to /api; Hono routes keep the original path in Request.url.
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
