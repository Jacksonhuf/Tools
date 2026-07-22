import type {
  RepricingBatchJobScope,
  RepricingBatchQueuedJob,
} from "../repricing-batch-job-types.js";
import type { RepricingBatchJobStore } from "./repricing-batch-job-store-types.js";

const queue: RepricingBatchQueuedJob[] = [];
let queueSeq = 0;

function mapJob(job: RepricingBatchQueuedJob): RepricingBatchQueuedJob {
  return { ...job, sku_ids: job.sku_ids ? [...job.sku_ids] : null };
}

export class MemoryRepricingBatchJobStore implements RepricingBatchJobStore {
  readonly driver = "memory" as const;

  async enqueue(input: {
    tenant_id: string;
    scope: RepricingBatchJobScope;
    sku_id?: string;
    shard_total: number;
    sku_ids?: string[];
  }): Promise<RepricingBatchQueuedJob> {
    if (input.scope === "sku" && !input.sku_id?.trim()) {
      throw new Error("SKU_ID_REQUIRED");
    }
    queueSeq += 1;
    const now = new Date().toISOString();
    const job: RepricingBatchQueuedJob = {
      job_id: `repricing-batch-q-${queueSeq}`,
      tenant_id: input.tenant_id,
      scope: input.scope,
      sku_id: input.scope === "sku" ? input.sku_id!.trim() : null,
      shard_total: input.shard_total,
      sku_ids: input.sku_ids?.length ? [...input.sku_ids] : null,
      status: "queued",
      created_at: now,
      updated_at: now,
      error: null,
      result: null,
    };
    queue.push(job);
    return mapJob(job);
  }

  async list(tenantId: string, limit: number): Promise<RepricingBatchQueuedJob[]> {
    return queue
      .filter((j) => j.tenant_id === tenantId)
      .slice(-limit)
      .reverse()
      .map(mapJob);
  }

  async get(
    tenantId: string,
    jobId: string
  ): Promise<RepricingBatchQueuedJob | undefined> {
    const job = queue.find((j) => j.job_id === jobId);
    if (!job || job.tenant_id !== tenantId) return undefined;
    return mapJob(job);
  }

  async claimQueued(
    tenantId: string,
    limit: number
  ): Promise<RepricingBatchQueuedJob[]> {
    const claimed: RepricingBatchQueuedJob[] = [];
    for (const job of queue) {
      if (
        job.tenant_id === tenantId &&
        job.status === "queued" &&
        claimed.length < limit
      ) {
        job.status = "processing";
        job.updated_at = new Date().toISOString();
        claimed.push(mapJob(job));
      }
    }
    return claimed;
  }

  async save(job: RepricingBatchQueuedJob): Promise<void> {
    const idx = queue.findIndex((j) => j.job_id === job.job_id);
    if (idx >= 0) {
      queue[idx] = { ...job };
    }
  }

  async summary(tenantId: string) {
    const jobs = queue.filter((j) => j.tenant_id === tenantId);
    return {
      total: jobs.length,
      queued: jobs.filter((j) => j.status === "queued").length,
      failed: jobs.filter((j) => j.status === "failed").length,
    };
  }

  resetForTests(): void {
    queue.length = 0;
    queueSeq = 0;
  }
}
