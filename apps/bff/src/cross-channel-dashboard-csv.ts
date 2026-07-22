import type { buildCrossChannelDashboard } from "./cross-channel-dashboard.js";

type Dashboard = Awaited<ReturnType<typeof buildCrossChannelDashboard>>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function crossChannelDashboardToCsv(snapshot: Dashboard): string {
  const lines = [
    "generated_at,sku_id,sku_code,name,mercado_libre_active_mxn,amazon_mx_active_mxn,spread_warning_pct",
  ];
  for (const row of snapshot.items) {
    lines.push(
      [
        cell(snapshot.generated_at),
        cell(row.sku_id),
        cell(row.sku_code),
        cell(row.name),
        cell(row.mercado_libre_active_mxn),
        cell(row.amazon_mx_active_mxn),
        cell(row.warning?.spread_pct ?? null),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
