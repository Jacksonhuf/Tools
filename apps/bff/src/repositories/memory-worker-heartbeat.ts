import type { WorkerHeartbeat } from "../worker-heartbeat-types.js";
import type { WorkerHeartbeatRepository } from "./worker-heartbeat-types.js";

const heartbeats = new Map<string, WorkerHeartbeat>();

export class MemoryWorkerHeartbeatRepository
  implements WorkerHeartbeatRepository
{
  readonly driver = "memory" as const;

  async record(input: {
    worker_id: string;
    tenant_id?: string;
    details?: Record<string, unknown>;
  }): Promise<WorkerHeartbeat> {
    const entry: WorkerHeartbeat = {
      worker_id: input.worker_id,
      reported_at: new Date().toISOString(),
      tenant_id: input.tenant_id ?? null,
      details: input.details,
    };
    heartbeats.set(input.worker_id, entry);
    return entry;
  }

  async list(): Promise<WorkerHeartbeat[]> {
    return [...heartbeats.values()].sort((a, b) =>
      b.reported_at.localeCompare(a.reported_at)
    );
  }

  async resetForTests(): Promise<void> {
    heartbeats.clear();
  }
}
