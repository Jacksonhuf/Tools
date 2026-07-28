import type { WorkerHeartbeatRepository } from "./worker-heartbeat-types.js";
import { MemoryWorkerHeartbeatRepository } from "./memory-worker-heartbeat.js";
import { PostgresWorkerHeartbeatRepository } from "./postgres-worker-heartbeat.js";

let singleton: WorkerHeartbeatRepository | undefined;

export function createWorkerHeartbeatRepository(): WorkerHeartbeatRepository {
  if (process.env.WORKER_HEARTBEAT_DRIVER === "memory") {
    return new MemoryWorkerHeartbeatRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresWorkerHeartbeatRepository(url);
  }
  return new MemoryWorkerHeartbeatRepository();
}

export function getWorkerHeartbeatRepository(): WorkerHeartbeatRepository {
  if (!singleton) {
    singleton = createWorkerHeartbeatRepository();
  }
  return singleton;
}

export function setWorkerHeartbeatRepository(
  repo: WorkerHeartbeatRepository
): void {
  singleton = repo;
}
