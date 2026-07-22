import type { WorkerHeartbeat } from "./worker-heartbeat.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function workerHeartbeatsToCsv(
  workers: Array<WorkerHeartbeat & { stale: boolean }>,
  exportedAt: string
): string {
  const lines = ["exported_at,worker_id,reported_at,stale,details_json"];
  for (const w of workers) {
    lines.push(
      [
        exportedAt,
        cell(w.worker_id),
        cell(w.reported_at),
        w.stale ? "true" : "false",
        cell(JSON.stringify(w.details ?? {})),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
