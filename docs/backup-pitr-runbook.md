# Backup & PITR Runbook (Wave 0)

## Overview

MX Pricing uses PostgreSQL logical backups (`pg_dump`) plus WAL archiving for point-in-time recovery (PITR) on managed or self-hosted Postgres.

## Environment variables

| Variable | Description |
|----------|-------------|
| `BACKUP_ENABLED` | `true` in staging/production |
| `PITR_ENABLED` | `true` when WAL archiving is configured |
| `PITR_WAL_ARCHIVE_DIR` | Local WAL archive path (self-hosted) |
| `BACKUP_CRON_SCHEDULE` | Cron expression for scheduled backups |
| `BACKUP_RETENTION_DAYS` | Retention policy (e.g. 30) |
| `BACKUP_LAST_COMPLETED_AT` | ISO timestamp of last successful backup |
| `BACKUP_OUTPUT_DIR` | Output directory for `pg-backup.mjs` |

## Logical backup

```bash
export DATABASE_URL=postgresql://...
export BACKUP_OUTPUT_DIR=./backups
node scripts/backup/pg-backup.mjs
```

## Restore drill (validate dump file)

```bash
node scripts/backup/pg-restore-drill.mjs ./backups/mx-pricing-<timestamp>.sql
```

## PITR (managed Postgres)

For AWS RDS, GCP Cloud SQL, or Azure Database:

1. Enable automated backups with retention ≥ `BACKUP_RETENTION_DAYS`
2. Enable point-in-time recovery in the console
3. Set `PITR_ENABLED=true` and record `BACKUP_LAST_COMPLETED_AT` after each drill

## Local staging stack

```bash
docker compose -f docker-compose.staging.yml up -d
mkdir -p backups/wal-archive
```

Postgres starts with `wal_level=replica` and `archive_mode=on` for PITR rehearsal.

## API status

`GET /api/v1/ops/backup/status` — backup/PITR readiness for the current `DEPLOY_ENV`.

## CI

Weekly workflow `.github/workflows/ci-backup-drill.yml` runs restore drill against a sample dump.

## Related

- Version backup (application layer): [version-backup-restore.md](./version-backup-restore.md)
- Go-live gate: [go-live-checklist.md](./go-live-checklist.md)
