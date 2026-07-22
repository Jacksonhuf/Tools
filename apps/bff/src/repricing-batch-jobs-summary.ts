import {
  listRepricingBatchJobs,
  resolveRepricingBatchQueueDriver,
} from "./repricing-batch-job-queue.js";

export async function summarizeRepricingBatchJobs(
  tenantId: string,
  sampleLimit = 50
) {
  const items = await listRepricingBatchJobs(tenantId, sampleLimit);
  const summary = {
    sampled: items.length,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  for (const job of items) {
    if (job.status === "queued") summary.queued += 1;
    else if (job.status === "processing") summary.processing += 1;
    else if (job.status === "completed") summary.completed += 1;
    else if (job.status === "failed") summary.failed += 1;
  }
  return {
    driver: resolveRepricingBatchQueueDriver(),
    summary,
    last_job_at: items[0]?.updated_at ?? null,
  };
}
