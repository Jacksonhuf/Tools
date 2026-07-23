export interface WorkerHeartbeat {
  worker_id: string;
  reported_at: string;
  details?: Record<string, unknown>;
}

const heartbeats = new Map<string, WorkerHeartbeat>();

export function recordWorkerHeartbeat(input: {
  worker_id: string;
  details?: Record<string, unknown>;
}): WorkerHeartbeat {
  const entry: WorkerHeartbeat = {
    worker_id: input.worker_id,
    reported_at: new Date().toISOString(),
    details: input.details,
  };
  heartbeats.set(input.worker_id, entry);
  return entry;
}

export function listWorkerHeartbeats(): WorkerHeartbeat[] {
  return [...heartbeats.values()].sort((a, b) =>
    b.reported_at.localeCompare(a.reported_at)
  );
}

export function getWorkerHeartbeat(
  workerId: string
): WorkerHeartbeat | undefined {
  return heartbeats.get(workerId);
}

export function getAsyncWorkerStatus() {
  const beats = listWorkerHeartbeats();
  const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
  const now = Date.now();
  return {
    workers: beats.map((b) => ({
      ...b,
      stale:
        now - new Date(b.reported_at).getTime() > staleSec * 1000,
    })),
    scripts: {
      repricing_batch: "npm run repricing-batch:worker",
      async_queue: "npm run dev:async-worker",
    },
    generated_at: new Date().toISOString(),
  };
}

export function resetWorkerHeartbeatsForTests(): void {
  heartbeats.clear();
}
