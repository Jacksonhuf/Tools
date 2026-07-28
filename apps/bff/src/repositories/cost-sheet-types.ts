import type { FreightAllocRule, CostSheetRecord } from "../cost-sheet-types.js";

export interface CostSheetRepository {
  readonly driver: "memory" | "postgres";
  list(tenantId: string, skuId: string): Promise<CostSheetRecord[]>;
  get(
    tenantId: string,
    skuId: string,
    sheetId: string
  ): Promise<CostSheetRecord | undefined>;
  create(
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
  ): Promise<CostSheetRecord>;
  resetForTests(): Promise<void>;
}
