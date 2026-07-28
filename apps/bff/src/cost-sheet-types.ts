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
