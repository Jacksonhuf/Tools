import type { RepricingBatchQueuedJob } from "./repricing-batch-job-types.js";

export function repricingBatchJobsToCsv(
  jobs: RepricingBatchQueuedJob[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,job_id,scope,sku_id,shard_total,status,created_at,updated_at,error",
  ];
  for (const j of jobs) {
    const err = j.error?.replace(/"/g, '""') ?? "";
    lines.push(
      [
        exportedAt,
        j.job_id,
        j.scope,
        j.sku_id ?? "",
        j.shard_total,
        j.status,
        j.created_at,
        j.updated_at,
        err.includes(",") || err.includes('"') ? `"${err}"` : err,
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
