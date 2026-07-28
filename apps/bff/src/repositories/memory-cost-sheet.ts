import type { CostSheetRecord } from "../cost-sheet-types.js";
import type { CostSheetRepository } from "./cost-sheet-types.js";

let seq = 1;
const byTenantSku = new Map<string, CostSheetRecord[]>();

function key(tenantId: string, skuId: string): string {
  return `${tenantId}:${skuId}`;
}

export class MemoryCostSheetRepository implements CostSheetRepository {
  readonly driver = "memory" as const;

  async list(tenantId: string, skuId: string): Promise<CostSheetRecord[]> {
    return [...(byTenantSku.get(key(tenantId, skuId)) ?? [])].sort((a, b) =>
      b.effective_from.localeCompare(a.effective_from)
    );
  }

  async get(
    tenantId: string,
    skuId: string,
    sheetId: string
  ): Promise<CostSheetRecord | undefined> {
    const rows = await this.list(tenantId, skuId);
    return rows.find((s) => s.id === sheetId);
  }

  async create(
    tenantId: string,
    skuId: string,
    input: {
      batch_no: string;
      cogs_amount: number;
      cogs_currency?: string;
      freight_alloc_mxn?: number;
      freight_alloc_rule?: import("../cost-sheet-types.js").FreightAllocRule;
      effective_from?: string;
      source?: string;
    }
  ): Promise<CostSheetRecord> {
    if (!input.batch_no?.trim()) throw new Error("BATCH_NO_REQUIRED");
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

  async resetForTests(): Promise<void> {
    byTenantSku.clear();
    seq = 1;
  }
}
