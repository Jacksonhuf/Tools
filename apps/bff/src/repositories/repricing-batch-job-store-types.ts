import type {
  RepricingBatchJobScope,
  RepricingBatchQueuedJob,
} from "../repricing-batch-job-types.js";

export interface RepricingBatchJobStore {
  readonly driver: "memory" | "postgres";
  enqueue(input: {
    tenant_id: string;
    scope: RepricingBatchJobScope;
    sku_id?: string;
    shard_total: number;
    sku_ids?: string[];
  }): Promise<RepricingBatchQueuedJob>;
  list(tenantId: string, limit: number): Promise<RepricingBatchQueuedJob[]>;
  get(
    tenantId: string,
    jobId: string
  ): Promise<RepricingBatchQueuedJob | undefined>;
  claimQueued(
    tenantId: string,
    limit: number
  ): Promise<RepricingBatchQueuedJob[]>;
  save(job: RepricingBatchQueuedJob): Promise<void>;
  summary(tenantId: string): Promise<{
    total: number;
    queued: number;
    failed: number;
  }>;
  resetForTests?(): void;
}
