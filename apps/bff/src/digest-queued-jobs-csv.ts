import type { DigestQueuedJob } from "./digest-job-queue.js";
import { digestQueueSummary } from "./digest-job-queue.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function digestQueuedJobsToCsv(
  jobs: DigestQueuedJob[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,job_id,status,attempts,error,created_at,updated_at,date,channels",
  ];
  for (const j of jobs) {
    lines.push(
      [
        cell(exportedAt),
        cell(j.job_id),
        cell(j.status),
        j.attempts,
        cell(j.error),
        cell(j.created_at),
        cell(j.updated_at),
        cell(j.date),
        cell(j.channels.join("|")),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function buildDigestQueuedJobsSummary(
  tenantId: string,
  jobs: DigestQueuedJob[]
) {
  return {
    tenant_id: tenantId,
    queue: digestQueueSummary(tenantId),
    sampled: jobs.length,
    items: jobs.map((j) => ({
      job_id: j.job_id,
      status: j.status,
      attempts: j.attempts,
      updated_at: j.updated_at,
    })),
  };
}
