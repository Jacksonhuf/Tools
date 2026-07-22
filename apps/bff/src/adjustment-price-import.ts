export interface AdjustmentPriceImportRow {
  listing_id: string;
  explicit_price_mxn: number;
}

export function parseAdjustmentPriceCsv(text: string): {
  rows: AdjustmentPriceImportRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["EMPTY_CSV"] };
  }
  const header = lines[0].split(",").map((p) => p.trim().toLowerCase());
  const hasHeader =
    header.includes("listing_id") && header.includes("explicit_price_mxn");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const listingCol = hasHeader ? header.indexOf("listing_id") : 0;
  const priceCol = hasHeader ? header.indexOf("explicit_price_mxn") : 1;

  const rows: AdjustmentPriceImportRow[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(",").map((p) => p.trim());
    const listing_id = parts[listingCol];
    const price = Number(parts[priceCol]);
    if (!listing_id) {
      errors.push(`ROW_${i + 1}:MISSING_LISTING`);
      continue;
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`ROW_${i + 1}:INVALID_PRICE`);
      continue;
    }
    rows.push({ listing_id, explicit_price_mxn: price });
  }
  return { rows, errors };
}

export const ADJUSTMENT_IMPORT_TEMPLATE_CSV =
  "listing_id,explicit_price_mxn\nlisting-ml-001,1650\nlisting-amz-001,1700\n";
