export type AdjustmentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "applied";

export interface AdjustmentItemRecord {
  id: string;
  batch_id: string;
  listing_id: string;
  explicit_price_mxn: number;
  from_price_mxn: number | null;
  guard_result: string | null;
  to_version_id: string | null;
}

export interface AdjustmentBatchRecord {
  id: string;
  tenant_id: string;
  status: AdjustmentStatus;
  reason_code: string | null;
  created_at: string;
  approved_at: string | null;
  applied_at: string | null;
  items: AdjustmentItemRecord[];
}

export interface AdjustmentRepository {
  readonly driver: "memory" | "postgres";
  createBatch(input: {
    tenant_id: string;
    reason_code?: string;
    status: AdjustmentStatus;
    items: Array<{
      listing_id: string;
      explicit_price_mxn: number;
      from_price_mxn: number | null;
      guard_result: string | null;
    }>;
  }): Promise<AdjustmentBatchRecord>;
  getBatch(
    tenantId: string,
    batchId: string
  ): Promise<AdjustmentBatchRecord | undefined>;
  updateBatchStatus(
    tenantId: string,
    batchId: string,
    status: AdjustmentStatus,
    extra?: { approved_at?: string; applied_at?: string }
  ): Promise<AdjustmentBatchRecord | undefined>;
  setItemVersionId(
    batchId: string,
    itemId: string,
    to_version_id: string
  ): Promise<void>;
  resetForTests?(): void;
}
