import type { WorkerHeartbeat } from "../worker-heartbeat-types.js";

export interface WorkerHeartbeatRepository {
  readonly driver: "memory" | "postgres";
  record(input: {
    worker_id: string;
    tenant_id?: string;
    details?: Record<string, unknown>;
  }): Promise<WorkerHeartbeat>;
  list(): Promise<WorkerHeartbeat[]>;
  resetForTests(): Promise<void>;
}
