import type { WorkerHeartbeat } from "./worker-heartbeat-types.js";
import { getWorkerHeartbeatRepository } from "./repositories/worker-heartbeat-index.js";

export type { WorkerHeartbeat } from "./worker-heartbeat-types.js";

export async function recordWorkerHeartbeat(input: {
  worker_id: string;
  tenant_id?: string;
  details?: Record<string, unknown>;
}): Promise<WorkerHeartbeat> {
  return getWorkerHeartbeatRepository().record(input);
}

export async function listWorkerHeartbeats(): Promise<WorkerHeartbeat[]> {
  return getWorkerHeartbeatRepository().list();
}

export async function getWorkerHeartbeat(
  workerId: string
): Promise<WorkerHeartbeat | undefined> {
  const beats = await listWorkerHeartbeats();
  return beats.find((b) => b.worker_id === workerId);
}

export async function getAsyncWorkerStatus() {
  const beats = await listWorkerHeartbeats();
  const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
  const now = Date.now();
  return {
    driver: getWorkerHeartbeatRepository().driver,
    workers: beats.map((b) => ({
      ...b,
      stale: now - new Date(b.reported_at).getTime() > staleSec * 1000,
    })),
    scripts: {
      repricing_batch: "npm run repricing-batch:worker",
      async_queue: "npm run dev:async-worker",
      repricing_event: "npm run repricing-event:worker",
    },
    generated_at: new Date().toISOString(),
  };
}

export function resetWorkerHeartbeatsForTests(): void {
  void getWorkerHeartbeatRepository().resetForTests();
}
