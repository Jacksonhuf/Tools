import { resolveDeployEnvironment } from "./deploy-environment.js";

export interface BackupPitrStatus {
  deploy_env: string;
  backup_enabled: boolean;
  pitr_configured: boolean;
  backup_schedule: string | null;
  last_backup_at: string | null;
  retention_days: number | null;
  ready: boolean;
  issues: string[];
}

export function evaluateBackupPitrStatus(): BackupPitrStatus {
  const deploy_env = resolveDeployEnvironment();
  const backup_enabled =
    process.env.BACKUP_ENABLED?.trim().toLowerCase() === "true";
  const pitr_configured =
    process.env.PITR_ENABLED?.trim().toLowerCase() === "true" ||
    Boolean(process.env.PITR_WAL_ARCHIVE_DIR?.trim());
  const backup_schedule = process.env.BACKUP_CRON_SCHEDULE?.trim() || null;
  const last_backup_at = process.env.BACKUP_LAST_COMPLETED_AT?.trim() || null;
  const retention_raw = process.env.BACKUP_RETENTION_DAYS?.trim();
  const retention_days = retention_raw ? Number(retention_raw) : null;
  const issues: string[] = [];

  if (deploy_env === "production") {
    if (!backup_enabled) {
      issues.push("BACKUP_ENABLED must be true in production");
    }
    if (!pitr_configured) {
      issues.push("PITR_ENABLED or PITR_WAL_ARCHIVE_DIR required in production");
    }
    if (!backup_schedule) {
      issues.push("BACKUP_CRON_SCHEDULE should be set in production");
    }
    if (!last_backup_at) {
      issues.push("BACKUP_LAST_COMPLETED_AT not recorded (run backup drill)");
    }
  } else if (deploy_env === "staging") {
    if (!backup_enabled) {
      issues.push("BACKUP_ENABLED recommended in staging");
    }
  }

  const ready =
    deploy_env === "development" ||
    (deploy_env === "staging" && backup_enabled) ||
    (deploy_env === "production" && issues.length === 0);

  return {
    deploy_env,
    backup_enabled,
    pitr_configured,
    backup_schedule,
    last_backup_at,
    retention_days,
    ready,
    issues,
  };
}
