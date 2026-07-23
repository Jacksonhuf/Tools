export interface ListingCsvRow {
  id: string;
  sku_id: string;
  channel: string;
}

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function listingsToCsv(
  rows: ListingCsvRow[],
  exportedAt: string
): string {
  const lines = ["exported_at,listing_id,sku_id,channel"];
  for (const row of rows) {
    lines.push(
      [exportedAt, cell(row.id), cell(row.sku_id), cell(row.channel)].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
