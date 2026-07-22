export type RepricingBatchJobScope = "tenant" | "sku";

export type RepricingBatchJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface RepricingBatchQueuedJob {
  job_id: string;
  tenant_id: string;
  scope: RepricingBatchJobScope;
  sku_id: string | null;
  shard_total: number;
  sku_ids: string[] | null;
  status: RepricingBatchJobStatus;
  created_at: string;
  updated_at: string;
  error: string | null;
  result: unknown | null;
}
