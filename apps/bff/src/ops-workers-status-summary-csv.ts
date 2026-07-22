import type { getAsyncWorkerStatus } from "./worker-heartbeat.js";

type OpsWorkersStatus = ReturnType<typeof getAsyncWorkerStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function opsWorkersStatusSummaryToCsv(
  status: OpsWorkersStatus,
  exportedAt: string
): string {
  const staleCount = status.workers.filter((w) => w.stale).length;
  const lines = [
    "exported_at,worker_count,stale_count,repricing_batch_script,async_queue_script,status_generated_at",
  ];
  lines.push(
    [
      exportedAt,
      status.workers.length,
      staleCount,
      cell(status.scripts.repricing_batch),
      cell(status.scripts.async_queue),
      cell(status.generated_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
