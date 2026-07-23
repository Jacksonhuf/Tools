import type { PriceVersionRecord } from "./version-store.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function priceVersionToCsv(
  version: PriceVersionRecord,
  exportedAt: string
): string {
  const lines = [
    "exported_at,version_id,sku_id,channel,state,publish_price_mxn,created_at,channel_publish_status,trigger_event_id,dynamic_rule_id,floor_snapshot_id,cost_snapshot_id",
  ];
  lines.push(
    [
      exportedAt,
      cell(version.id),
      cell(version.sku_id),
      cell(version.channel),
      cell(version.state),
      version.publish_price_mxn,
      cell(version.created_at),
      cell(version.channel_publish_status ?? ""),
      cell(version.trigger_event_id ?? ""),
      cell(version.dynamic_rule_id ?? ""),
      cell(version.floor_snapshot_id ?? ""),
      cell(version.cost_snapshot_id ?? ""),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
