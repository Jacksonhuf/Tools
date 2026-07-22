import type { DigestDispatchRecord } from "./agent-digest-dispatch.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function digestDispatchesToCsv(
  dispatches: DigestDispatchRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,job_id,date,status,created_at,delivery_channels,delivery_statuses",
  ];
  for (const d of dispatches) {
    lines.push(
      [
        exportedAt,
        cell(d.job_id),
        cell(d.date),
        cell(d.status),
        cell(d.created_at),
        cell(d.deliveries.map((x) => x.channel).join("|")),
        cell(d.deliveries.map((x) => x.status).join("|")),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
