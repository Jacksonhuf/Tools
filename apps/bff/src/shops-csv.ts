import type { SalesChannel } from "@mx-pricing/channel-adapters";

export interface ShopCsvRow {
  id: string;
  channel: SalesChannel;
  name: string;
  external_seller_id: string | null;
  auth_status: string;
  token_expires_at: string | null;
  created_at: string;
}

function cell(value: string | null | undefined): string {
  const raw = value == null ? "" : value;
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function shopsToCsv(rows: ShopCsvRow[], exportedAt: string): string {
  const lines = [
    "exported_at,shop_id,channel,name,external_seller_id,auth_status,token_expires_at,created_at",
  ];
  for (const s of rows) {
    lines.push(
      [
        exportedAt,
        cell(s.id),
        cell(s.channel),
        cell(s.name),
        cell(s.external_seller_id),
        cell(s.auth_status),
        cell(s.token_expires_at),
        cell(s.created_at),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
