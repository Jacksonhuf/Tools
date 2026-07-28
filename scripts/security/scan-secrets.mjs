#!/usr/bin/env node
/**
 * Lightweight secret-pattern scan for X-03 (no external deps).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "playwright-report",
]);
const TEXT_EXT = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".env",
]);

const PATTERNS = [
  {
    id: "hardcoded-aws-key",
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    id: "private-key-block",
    regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  },
  {
    id: "refresh-token-literal",
    regex: /refresh_token\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/,
  },
];

const ALLOWLIST = [
  /tests\//,
  /docs\//,
  /\.example$/,
  /mock-/,
  /channel-oauth\.ts/,
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (TEXT_EXT.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

function isAllowlisted(path) {
  return ALLOWLIST.some((re) => re.test(path));
}

const findings = [];
for (const file of walk(ROOT)) {
  if (isAllowlisted(file)) continue;
  const content = readFileSync(file, "utf-8");
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(content)) {
      findings.push({ file, pattern: pattern.id });
    }
  }
}

if (findings.length > 0) {
  console.error("Security scan findings:");
  for (const f of findings) {
    console.error(`- ${f.pattern}: ${f.file}`);
  }
  process.exit(1);
}

console.log("Security pattern scan: no findings");
