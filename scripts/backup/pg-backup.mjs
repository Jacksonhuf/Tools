#!/usr/bin/env node
/**
 * PostgreSQL logical backup (pg_dump) for MX Pricing.
 * Set DATABASE_URL and BACKUP_OUTPUT_DIR before running.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const outputDir = process.env.BACKUP_OUTPUT_DIR?.trim() || "./backups";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outfile = join(outputDir, `mx-pricing-${timestamp}.sql`);

mkdirSync(outputDir, { recursive: true });

const result = spawnSync(
  "pg_dump",
  ["--no-owner", "--no-acl", "--format=plain", "--file", outfile, databaseUrl],
  { stdio: "inherit", encoding: "utf-8" }
);

if (result.status !== 0) {
  console.error("pg_dump failed");
  process.exit(result.status ?? 1);
}

const manifest = {
  completed_at: new Date().toISOString(),
  file: outfile,
  database_url_host: new URL(databaseUrl).host,
  pitr_note:
    "Enable WAL archiving on managed Postgres for point-in-time recovery (PITR).",
};

writeFileSync(`${outfile}.manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
