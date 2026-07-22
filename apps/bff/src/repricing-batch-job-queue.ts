import type { CatalogRepository } from "./repositories/types.js";
import type { CompetitorRepository } from "./repositories/competitor-index.js";
import type { RepricingRepository } from "./repositories/repricing-types.js";
import type {
  DynamicRuleRepository,
  ListingHealthRepository,
} from "./repositories/dynamic-rule-types.js";
import type { RepricingActivityRepository } from "./repositories/repricing-activity-types.js";
import {
  runRepricingBatchAllShards,
  runRepricingBatchForTenant,
} from "./repricing-batch-shard.js";

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

const queue: RepricingBatchQueuedJob[] = [];
let queueSeq = 0;

export function resetRepricingBatchJobQueueForTests(): void {
  queue.length = 0;
  queueSeq = 0;
}

export function listRepricingBatchJobs(
  tenantId: string,
  limit = 20
): RepricingBatchQueuedJob[] {
  return queue
    .filter((j) => j.tenant_id === tenantId)
    .slice(-limit)
    .reverse();
}

export function getRepricingBatchJob(
  tenantId: string,
  jobId: string
): RepricingBatchQueuedJob | undefined {
  const job = queue.find((j) => j.job_id === jobId);
  if (!job || job.tenant_id !== tenantId) return undefined;
  return job;
}

export function enqueueRepricingBatchJob(input: {
  tenant_id: string;
  scope: RepricingBatchJobScope;
  sku_id?: string;
  shard_total: number;
  sku_ids?: string[];
}): RepricingBatchQueuedJob {
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
  return job;
}

export type RepricingBatchQueueDeps = {
  catalog: CatalogRepository;
  competitors: CompetitorRepository;
  repricing: RepricingRepository;
  dynamicRules: DynamicRuleRepository;
  listingHealth: ListingHealthRepository;
  repricingActivity: RepricingActivityRepository;
};

async function runJob(
  deps: RepricingBatchQueueDeps,
  job: RepricingBatchQueuedJob
): Promise<unknown> {
  if (job.scope === "sku" && job.sku_id) {
    const result = await runRepricingBatchAllShards({
      ...deps,
      tenantId: job.tenant_id,
      skuId: job.sku_id,
      shardTotal: job.shard_total,
    });
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result;
  }
  return runRepricingBatchForTenant({
    ...deps,
    tenantId: job.tenant_id,
    shardTotal: job.shard_total,
    skuIds: job.sku_ids ?? undefined,
  });
}

export async function processRepricingBatchQueue(
  deps: RepricingBatchQueueDeps,
  tenantId: string,
  limit = 5
): Promise<{ processed: RepricingBatchQueuedJob[] }> {
  const pending = queue.filter(
    (j) => j.tenant_id === tenantId && j.status === "queued"
  );
  const batch = pending.slice(0, limit);
  const processed: RepricingBatchQueuedJob[] = [];

  for (const job of batch) {
    job.status = "processing";
    job.updated_at = new Date().toISOString();
    try {
      job.result = await runJob(deps, job);
      job.status = "completed";
      job.error = null;
    } catch (e) {
      job.status = "failed";
      job.error = String(e).slice(0, 200);
      job.result = null;
    }
    job.updated_at = new Date().toISOString();
    processed.push(job);
  }
  return { processed };
}

export function repricingBatchQueueSummary(tenantId: string) {
  const jobs = queue.filter((j) => j.tenant_id === tenantId);
  return {
    total: jobs.length,
    queued: jobs.filter((j) => j.status === "queued").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };
}
