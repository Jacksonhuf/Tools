#!/usr/bin/env node
/**
 * Bundle the Vercel serverless entry so workspace imports resolve at runtime.
 * Output: api/index.js (consumed by Vercel; source is api/handler.ts).
 */
import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const workspaceNames = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
].filter((name) => name.startsWith("@mx-pricing/"));

await esbuild.build({
  entryPoints: ["api/handler.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "external",
  external: ["pg-native"],
  logLevel: "info",
});

console.log(
  JSON.stringify({
    ok: true,
    outfile: "api/index.js",
    external_workspace_packages: workspaceNames,
  })
);
