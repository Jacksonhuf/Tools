import type { buildListingSyncOpsStatus } from "./listing-sync-ops-status.js";

type ListingSyncOpsStatus = ReturnType<typeof buildListingSyncOpsStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function listingSyncOpsStatusToCsv(
  status: ListingSyncOpsStatus,
  exportedAt: string
): string {
  const lines = [
    "exported_at,schedule_enabled,cron_expression,job_sampled,job_ok,job_failed,last_finished_at",
  ];
  lines.push(
    [
      exportedAt,
      status.schedule.enabled ? "true" : "false",
      cell(status.schedule.cron_expression),
      status.job_summary.sampled,
      status.job_summary.ok,
      status.job_summary.failed,
      cell(status.job_summary.last_finished_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
