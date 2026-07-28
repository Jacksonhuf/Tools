#!/usr/bin/env node
/**
 * Backup restore drill — validates a pg_dump file is readable SQL.
 * Does not apply restore; use only for X-05 / PITR drill verification.
 */
import { readFileSync, statSync } from "node:fs";

const backupFile = process.argv[2] ?? process.env.BACKUP_FILE;
if (!backupFile?.trim()) {
  console.error("Usage: node pg-restore-drill.mjs <backup.sql>");
  process.exit(1);
}

const sql = readFileSync(backupFile, "utf-8");
const size = statSync(backupFile).size;
const hasCreateTable = /CREATE TABLE/i.test(sql);
const hasCopy = /COPY\s+/i.test(sql) || /INSERT INTO/i.test(sql);

const result = {
  file: backupFile,
  bytes: size,
  has_create_table: hasCreateTable,
  has_data: hasCopy,
  valid: size > 100 && hasCreateTable,
  checked_at: new Date().toISOString(),
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.valid ? 0 : 1);
