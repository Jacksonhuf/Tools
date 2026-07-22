export type FreightAllocRule = "PER_UNIT" | "WEIGHT_BASED";

export interface CostSheetRecord {
  id: string;
  tenant_id: string;
  sku_id: string;
  batch_no: string;
  cogs_amount: number;
  cogs_currency: string;
  freight_alloc_mxn: number;
  freight_alloc_rule: FreightAllocRule;
  effective_from: string;
  source: string;
}

let seq = 1;
const byTenantSku = new Map<string, CostSheetRecord[]>();

function key(tenantId: string, skuId: string): string {
  return `${tenantId}:${skuId}`;
}

export function listCostSheets(
  tenantId: string,
  skuId: string
): CostSheetRecord[] {
  return [...(byTenantSku.get(key(tenantId, skuId)) ?? [])].sort((a, b) =>
    b.effective_from.localeCompare(a.effective_from)
  );
}

export function getCostSheet(
  tenantId: string,
  skuId: string,
  sheetId: string
): CostSheetRecord | undefined {
  return listCostSheets(tenantId, skuId).find((s) => s.id === sheetId);
}

export function createCostSheet(
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
): CostSheetRecord {
  if (!input.batch_no?.trim()) {
    throw new Error("BATCH_NO_REQUIRED");
  }
  if (!Number.isFinite(input.cogs_amount) || input.cogs_amount <= 0) {
    throw new Error("COGS_AMOUNT_INVALID");
  }
  const row: CostSheetRecord = {
    id: `cs-${seq++}`,
    tenant_id: tenantId,
    sku_id: skuId,
    batch_no: input.batch_no.trim(),
    cogs_amount: input.cogs_amount,
    cogs_currency: (input.cogs_currency ?? "MXN").toUpperCase(),
    freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
    freight_alloc_rule: input.freight_alloc_rule ?? "PER_UNIT",
    effective_from: input.effective_from ?? new Date().toISOString(),
    source: input.source ?? "manual",
  };
  const k = key(tenantId, skuId);
  const list = [...(byTenantSku.get(k) ?? [])];
  list.push(row);
  byTenantSku.set(k, list);
  return row;
}

export function resetCostSheetsForTests(): void {
  byTenantSku.clear();
  seq = 1;
}
