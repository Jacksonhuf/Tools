import type { RepricingEventRecord } from "./repositories/repricing-types.js";

function cell(value: string | null | undefined): string {
  const raw = value == null ? "" : value;
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function repricingEventsToCsv(
  events: RepricingEventRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,event_id,listing_id,channel,type,status,created_at,processed_at,dedupe_key",
  ];
  for (const e of events) {
    lines.push(
      [
        exportedAt,
        cell(e.id),
        cell(e.listing_id),
        cell(e.channel),
        cell(e.type),
        cell(e.status),
        cell(e.created_at),
        cell(e.processed_at),
        cell(e.dedupe_key),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
