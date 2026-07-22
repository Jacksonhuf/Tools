import type { CatalogRepository } from "./repositories/types.js";

export interface LandedCostImportRow {
  sku_id?: string;
  sku_code?: string;
  landed_cost_mxn: number;
}

export function parseLandedCostCsv(text: string): {
  rows: LandedCostImportRow[];
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

  const headerParts = lines[0].split(",").map((p) => p.trim().toLowerCase());
  const hasHeader =
    headerParts.includes("landed_cost_mxn") ||
    headerParts.includes("sku_id") ||
    headerParts.includes("sku_code");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const skuIdCol = hasHeader ? headerParts.indexOf("sku_id") : -1;
  const skuCodeCol = hasHeader ? headerParts.indexOf("sku_code") : -1;
  const costCol = hasHeader
    ? headerParts.findIndex((c) => c.includes("landed_cost"))
    : -1;

  const rows: LandedCostImportRow[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(",").map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`ROW_${i + 1}:INVALID_COLUMNS`);
      continue;
    }
    let cost: number;
    let row: LandedCostImportRow;
    if (hasHeader && costCol >= 0) {
      cost = Number(parts[costCol]);
      row = { landed_cost_mxn: cost };
      if (skuIdCol >= 0 && parts[skuIdCol]) row.sku_id = parts[skuIdCol];
      if (skuCodeCol >= 0 && parts[skuCodeCol]) row.sku_code = parts[skuCodeCol];
    } else {
      cost = Number(parts[parts.length - 1]);
      const key = parts.slice(0, -1).join(",").trim();
      row = { landed_cost_mxn: cost };
      if (key.startsWith("demo-") || key.includes("-sku-")) row.sku_id = key;
      else row.sku_code = key;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      errors.push(`ROW_${i + 1}:INVALID_COST`);
      continue;
    }
    row.landed_cost_mxn = cost;
    rows.push(row);
  }
  return { rows, errors };
}

export async function applyLandedCostImport(
  catalog: CatalogRepository,
  tenantId: string,
  rows: LandedCostImportRow[]
) {
  const updated: Array<{ sku_id: string; landed_cost_mxn: number }> = [];
  const skipped: Array<{ reason: string; row: LandedCostImportRow }> = [];

  for (const row of rows) {
    let sku = row.sku_id
      ? await catalog.getSku(tenantId, row.sku_id)
      : undefined;
    if (!sku && row.sku_code) {
      const all = await catalog.listSkus(tenantId);
      sku = all.find((s) => s.sku_code === row.sku_code);
    }
    if (!sku) {
      skipped.push({ reason: "SKU_NOT_FOUND", row });
      continue;
    }
    const next = await catalog.updateSkuLandedCost(
      tenantId,
      sku.id,
      row.landed_cost_mxn
    );
    if (next) {
      updated.push({ sku_id: next.id, landed_cost_mxn: next.landed_cost_mxn });
    }
  }

  return { updated, skipped };
}
