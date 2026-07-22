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
import { getRepricingBatchJobStore } from "./repricing-batch-job-store-index.js";
import type {
  RepricingBatchJobScope,
  RepricingBatchQueuedJob,
} from "./repricing-batch-job-types.js";

export type {
  RepricingBatchJobScope,
  RepricingBatchJobStatus,
  RepricingBatchQueuedJob,
} from "./repricing-batch-job-types.js";

export {
  resetRepricingBatchJobQueueForTests,
  resolveRepricingBatchQueueDriver,
} from "./repricing-batch-job-store-index.js";

export async function listRepricingBatchJobs(
  tenantId: string,
  limit = 20
): Promise<RepricingBatchQueuedJob[]> {
  return getRepricingBatchJobStore().list(tenantId, limit);
}

export async function getRepricingBatchJob(
  tenantId: string,
  jobId: string
): Promise<RepricingBatchQueuedJob | undefined> {
  return getRepricingBatchJobStore().get(tenantId, jobId);
}

export async function enqueueRepricingBatchJob(input: {
  tenant_id: string;
  scope: RepricingBatchJobScope;
  sku_id?: string;
  shard_total: number;
  sku_ids?: string[];
}): Promise<RepricingBatchQueuedJob> {
  return getRepricingBatchJobStore().enqueue(input);
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
  const store = getRepricingBatchJobStore();
  const batch = await store.claimQueued(tenantId, limit);
  const processed: RepricingBatchQueuedJob[] = [];

  for (const job of batch) {
    const working = { ...job };
    try {
      working.result = await runJob(deps, working);
      working.status = "completed";
      working.error = null;
    } catch (e) {
      working.status = "failed";
      working.error = String(e).slice(0, 200);
      working.result = null;
    }
    working.updated_at = new Date().toISOString();
    await store.save(working);
    processed.push(working);
  }
  return { processed };
}

export async function repricingBatchQueueSummary(tenantId: string) {
  const store = getRepricingBatchJobStore();
  const counts = await store.summary(tenantId);
  return {
    driver: store.driver,
    ...counts,
  };
}
