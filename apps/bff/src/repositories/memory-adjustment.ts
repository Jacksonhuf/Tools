import type {
  AdjustmentBatchRecord,
  AdjustmentRepository,
  AdjustmentStatus,
} from "./adjustment-types.js";

let batchSeq = 0;
let itemSeq = 0;
const batches = new Map<string, AdjustmentBatchRecord>();

export class MemoryAdjustmentRepository implements AdjustmentRepository {
  readonly driver = "memory" as const;

  async createBatch(input: {
    tenant_id: string;
    reason_code?: string;
    status: AdjustmentStatus;
    items: Array<{
      listing_id: string;
      explicit_price_mxn: number;
      from_price_mxn: number | null;
      guard_result: string | null;
    }>;
  }): Promise<AdjustmentBatchRecord> {
    batchSeq += 1;
    const id = `adj-${batchSeq}`;
    const items = input.items.map((it) => {
      itemSeq += 1;
      return {
        id: `adji-${itemSeq}`,
        batch_id: id,
        listing_id: it.listing_id,
        explicit_price_mxn: it.explicit_price_mxn,
        from_price_mxn: it.from_price_mxn,
        guard_result: it.guard_result,
        to_version_id: null,
      };
    });
    const record: AdjustmentBatchRecord = {
      id,
      tenant_id: input.tenant_id,
      status: input.status,
      reason_code: input.reason_code ?? null,
      created_at: new Date().toISOString(),
      approved_at: null,
      applied_at: null,
      items,
    };
    batches.set(id, record);
    return structuredClone(record);
  }

  async getBatch(
    tenantId: string,
    batchId: string
  ): Promise<AdjustmentBatchRecord | undefined> {
    const b = batches.get(batchId);
    if (!b || b.tenant_id !== tenantId) return undefined;
    return structuredClone(b);
  }

  async listBatches(
    tenantId: string,
    limit = 50
  ): Promise<AdjustmentBatchRecord[]> {
    return [...batches.values()]
      .filter((b) => b.tenant_id === tenantId)
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, limit)
      .map((b) => structuredClone(b));
  }

  async updateBatchStatus(
    tenantId: string,
    batchId: string,
    status: AdjustmentStatus,
    extra?: { approved_at?: string; applied_at?: string }
  ): Promise<AdjustmentBatchRecord | undefined> {
    const b = batches.get(batchId);
    if (!b || b.tenant_id !== tenantId) return undefined;
    b.status = status;
    if (extra?.approved_at) b.approved_at = extra.approved_at;
    if (extra?.applied_at) b.applied_at = extra.applied_at;
    return structuredClone(b);
  }

  async setItemVersionId(
    batchId: string,
    itemId: string,
    to_version_id: string
  ): Promise<void> {
    const b = batches.get(batchId);
    if (!b) return;
    const item = b.items.find((i) => i.id === itemId);
    if (item) item.to_version_id = to_version_id;
  }

  resetForTests(): void {
    batches.clear();
    batchSeq = 0;
    itemSeq = 0;
  }
}
