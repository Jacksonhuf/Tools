import type { TenantRepricingQueueRow } from "./repricing-queue-service.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function repricingQueueToCsv(
  rows: TenantRepricingQueueRow[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,sku_id,version_id,listing_id,channel,state,publish_price_mxn,created_at",
  ];
  for (const r of rows) {
    lines.push(
      [
        exportedAt,
        cell(r.sku_id),
        cell(r.version_id),
        cell(r.listing_id),
        cell(r.channel),
        cell(r.state),
        r.publish_price_mxn,
        cell(r.created_at),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
