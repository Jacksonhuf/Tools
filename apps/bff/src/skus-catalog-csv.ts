export interface SkuCatalogRow {
  id: string;
  sku_code: string;
  name: string;
  landed_cost_mxn: number;
}

function cell(value: string | number): string {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function skusCatalogToCsv(
  rows: SkuCatalogRow[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,sku_id,sku_code,name,landed_cost_mxn",
  ];
  for (const r of rows) {
    lines.push(
      [
        exportedAt,
        cell(r.id),
        cell(r.sku_code),
        cell(r.name),
        r.landed_cost_mxn,
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
