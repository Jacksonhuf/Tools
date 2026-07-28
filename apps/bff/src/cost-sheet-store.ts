export type { FreightAllocRule, CostSheetRecord } from "./cost-sheet-types.js";
import type { FreightAllocRule, CostSheetRecord } from "./cost-sheet-types.js";
import { getCostSheetRepository } from "./repositories/cost-sheet-index.js";

export async function listCostSheets(
  tenantId: string,
  skuId: string
): Promise<CostSheetRecord[]> {
  return getCostSheetRepository().list(tenantId, skuId);
}

export async function getCostSheet(
  tenantId: string,
  skuId: string,
  sheetId: string
): Promise<CostSheetRecord | undefined> {
  return getCostSheetRepository().get(tenantId, skuId, sheetId);
}

export async function createCostSheet(
  tenantId: string,
  skuId: string,
  input: {
    batch_no: string;
    cogs_amount: number;
    cogs_currency?: string;
    freight_alloc_mxn?: number;
    freight_alloc_rule?: FreightAllocRule;
    effective_from?: string;
    source?: string;
  }
): Promise<CostSheetRecord> {
  return getCostSheetRepository().create(tenantId, skuId, input);
}

export function resetCostSheetsForTests(): void {
  void getCostSheetRepository().resetForTests();
}

export function getCostSheetStoreStatus() {
  return { driver: getCostSheetRepository().driver };
}
