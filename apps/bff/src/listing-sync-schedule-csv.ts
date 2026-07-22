import type { ListingSyncSchedule } from "./listing-sync-schedule.js";

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function listingSyncScheduleToCsv(
  schedule: ListingSyncSchedule,
  exportedAt: string
): string {
  const lines = [
    "exported_at,tenant_id,enabled,cron_expression,note,updated_at,last_run_at",
  ];
  lines.push(
    [
      exportedAt,
      cell(schedule.tenant_id),
      schedule.enabled ? "true" : "false",
      cell(schedule.cron_expression),
      cell(schedule.note),
      cell(schedule.updated_at),
      cell(schedule.last_run_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
