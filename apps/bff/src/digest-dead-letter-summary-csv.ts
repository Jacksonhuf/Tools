import type { buildDigestDeadLetterSummary } from "./digest-dead-letter-csv.js";

type DigestDeadLetterSummary = ReturnType<typeof buildDigestDeadLetterSummary>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function digestDeadLetterSummaryToCsv(
  summary: DigestDeadLetterSummary,
  exportedAt: string
): string {
  const lines = [
    "exported_at,tenant_id,dead_letter_sampled,queue_total,queue_queued,queue_failed,queue_dead_letter",
  ];
  lines.push(
    [
      exportedAt,
      cell(summary.tenant_id),
      summary.dead_letter_sampled,
      summary.queue.total,
      summary.queue.queued,
      summary.queue.failed,
      summary.queue.dead_letter,
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
