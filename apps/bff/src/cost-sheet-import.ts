import type { CatalogRepository } from "./repositories/types.js";
import { createCostSheet } from "./cost-sheet-store.js";

export interface CostSheetImportRow {
  sku_id: string;
  batch_no: string;
  cogs_amount: number;
  cogs_currency?: string;
  freight_alloc_mxn?: number;
}

export const COST_SHEET_IMPORT_TEMPLATE_CSV =
  "sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn\ndemo-sku-001,BATCH-IMPORT-01,1000,MXN,0\n";

export function parseCostSheetCsv(text: string): {
  rows: CostSheetImportRow[];
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
  const required = ["sku_id", "batch_no", "cogs_amount"];
  if (!required.every((c) => header.includes(c))) {
    return { rows: [], errors: ["HEADER_INVALID"] };
  }
  const skuCol = header.indexOf("sku_id");
  const batchCol = header.indexOf("batch_no");
  const cogsCol = header.indexOf("cogs_amount");
  const currencyCol = header.indexOf("cogs_currency");
  const freightCol = header.indexOf("freight_alloc_mxn");

  const rows: CostSheetImportRow[] = [];
  for (let i = 0; i < lines.slice(1).length; i++) {
    const parts = lines[i + 1].split(",").map((p) => p.trim());
    const sku_id = parts[skuCol];
    const batch_no = parts[batchCol];
    const cogs_amount = Number(parts[cogsCol]);
    if (!sku_id) {
      errors.push(`ROW_${i + 1}:MISSING_SKU`);
      continue;
    }
    if (!batch_no) {
      errors.push(`ROW_${i + 1}:MISSING_BATCH`);
      continue;
    }
    if (!Number.isFinite(cogs_amount) || cogs_amount <= 0) {
      errors.push(`ROW_${i + 1}:INVALID_COGS`);
      continue;
    }
    rows.push({
      sku_id,
      batch_no,
      cogs_amount,
      cogs_currency:
        currencyCol >= 0 && parts[currencyCol]
          ? parts[currencyCol]
          : "MXN",
      freight_alloc_mxn:
        freightCol >= 0 && parts[freightCol]
          ? Number(parts[freightCol])
          : 0,
    });
  }
  return { rows, errors };
}

export async function applyCostSheetImport(
  catalog: CatalogRepository,
  tenantId: string,
  rows: CostSheetImportRow[]
) {
  const created: Array<{ sku_id: string; cost_sheet_id: string }> = [];
  const skipped: Array<{ sku_id: string; reason: string }> = [];
  for (const row of rows) {
    const sku = await catalog.getSku(tenantId, row.sku_id);
    if (!sku) {
      skipped.push({ sku_id: row.sku_id, reason: "SKU_NOT_FOUND" });
      continue;
    }
    try {
      const sheet = createCostSheet(tenantId, row.sku_id, {
        batch_no: row.batch_no,
        cogs_amount: row.cogs_amount,
        cogs_currency: row.cogs_currency,
        freight_alloc_mxn: row.freight_alloc_mxn,
        source: "csv-import",
      });
      created.push({ sku_id: row.sku_id, cost_sheet_id: sheet.id });
    } catch {
      skipped.push({ sku_id: row.sku_id, reason: "CREATE_FAILED" });
    }
  }
  return { created, skipped };
}
