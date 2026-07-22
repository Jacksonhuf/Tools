import type { AdjustmentBatchRecord } from "./repositories/adjustment-types.js";

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function adjustmentBatchToCsv(batch: AdjustmentBatchRecord): string {
  const lines = [
    "batch_id,status,reason_code,listing_id,explicit_price_mxn,from_price_mxn,guard_result,to_version_id",
  ];
  for (const item of batch.items) {
    lines.push(
      [
        csvCell(batch.id),
        csvCell(batch.status),
        csvCell(batch.reason_code),
        csvCell(item.listing_id),
        csvCell(item.explicit_price_mxn),
        csvCell(item.from_price_mxn),
        csvCell(item.guard_result),
        csvCell(item.to_version_id),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
