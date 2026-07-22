import type { ListingSyncJob } from "./listing-sync-journal.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function listingSyncJobsToCsv(
  jobs: ListingSyncJob[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,id,listing_id,shop_id,external_ref,status,channel_price_mxn,error_code,started_at,finished_at",
  ];
  for (const j of jobs) {
    lines.push(
      [
        cell(exportedAt),
        cell(j.id),
        cell(j.listing_id),
        cell(j.shop_id),
        cell(j.external_ref),
        cell(j.status),
        cell(j.channel_price_mxn),
        cell(j.error_code),
        cell(j.started_at),
        cell(j.finished_at),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
