import type { AdjustmentBatchRecord } from "./repositories/adjustment-types.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function adjustmentBatchesIndexToCsv(
  batches: AdjustmentBatchRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,batch_id,status,reason_code,item_count,created_at,approved_at,applied_at",
  ];
  for (const b of batches) {
    lines.push(
      [
        exportedAt,
        cell(b.id),
        cell(b.status),
        cell(b.reason_code),
        b.items.length,
        cell(b.created_at),
        cell(b.approved_at),
        cell(b.applied_at),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
