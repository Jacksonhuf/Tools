import type { summarizeRepricingBatchJobs } from "./repricing-batch-jobs-summary.js";

type RepricingBatchJobsSummary = Awaited<
  ReturnType<typeof summarizeRepricingBatchJobs>
>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function repricingBatchJobsSummaryToCsv(
  snapshot: RepricingBatchJobsSummary,
  exportedAt: string
): string {
  const lines = [
    "exported_at,driver,sampled,queued,processing,completed,failed,last_job_at",
  ];
  lines.push(
    [
      exportedAt,
      cell(snapshot.driver),
      snapshot.summary.sampled,
      snapshot.summary.queued,
      snapshot.summary.processing,
      snapshot.summary.completed,
      snapshot.summary.failed,
      cell(snapshot.last_job_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
