import type { DigestScheduleConfig } from "./agent-digest-dispatch.js";

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function digestScheduleToCsv(
  schedule: DigestScheduleConfig,
  exportedAt: string
): string {
  const lines = [
    "exported_at,tenant_id,enabled,cron,email_to,timezone,updated_at,last_dispatch_at",
  ];
  lines.push(
    [
      exportedAt,
      cell(schedule.tenant_id),
      schedule.enabled ? "true" : "false",
      cell(schedule.cron),
      cell(schedule.email_to),
      cell(schedule.timezone),
      cell(schedule.updated_at),
      cell(schedule.last_dispatch_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
