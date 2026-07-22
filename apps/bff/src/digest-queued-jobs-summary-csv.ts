import type { buildDigestQueuedJobsSummary } from "./digest-queued-jobs-csv.js";

type DigestQueuedJobsSummary = ReturnType<typeof buildDigestQueuedJobsSummary>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function digestQueuedJobsSummaryToCsv(
  summary: DigestQueuedJobsSummary,
  exportedAt: string
): string {
  const lines = [
    "exported_at,tenant_id,sampled,queue_total,queue_queued,queue_failed,queue_dead_letter",
  ];
  lines.push(
    [
      exportedAt,
      cell(summary.tenant_id),
      summary.sampled,
      summary.queue.total,
      summary.queue.queued,
      summary.queue.failed,
      summary.queue.dead_letter,
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
