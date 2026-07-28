import type { DigestQueuedJob } from "../digest-job-queue-types.js";
import type { DigestJobRepository } from "./digest-job-types.js";

let seq = 0;
const queue: DigestQueuedJob[] = [];

export class MemoryDigestJobRepository implements DigestJobRepository {
  readonly driver = "memory" as const;

  async list(tenantId: string, limit = 20): Promise<DigestQueuedJob[]> {
    return queue
      .filter((j) => j.tenant_id === tenantId)
      .slice(-limit)
      .reverse();
  }

  async get(tenantId: string, jobId: string) {
    const job = queue.find((j) => j.job_id === jobId);
    if (!job || job.tenant_id !== tenantId) return undefined;
    return job;
  }

  async listDeadLetter(tenantId: string, limit = 20) {
    return queue
      .filter((j) => j.tenant_id === tenantId && j.status === "dead_letter")
      .slice(-limit)
      .reverse();
  }

  async summary(tenantId: string) {
    const jobs = queue.filter((j) => j.tenant_id === tenantId);
    return {
      total: jobs.length,
      queued: jobs.filter((j) => j.status === "queued").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      dead_letter: jobs.filter((j) => j.status === "dead_letter").length,
    };
  }

  async enqueue(input: Parameters<DigestJobRepository["enqueue"]>[0]) {
    seq += 1;
    const now = new Date().toISOString();
    const job: DigestQueuedJob = {
      job_id: `digest-q-${seq}`,
      tenant_id: input.tenant_id,
      locale: input.locale,
      date: input.date?.trim() || null,
      channels: input.channels?.length
        ? input.channels
        : ["email_stub", "webhook_queue"],
      status: "queued",
      attempts: 0,
      simulate_poison: input.simulate_poison === true,
      created_at: now,
      updated_at: now,
      error: null,
      result: null,
    };
    queue.push(job);
    return job;
  }

  async listPending(tenantId: string, limit: number, maxAttempts: number) {
    return queue
      .filter(
        (j) =>
          j.tenant_id === tenantId &&
          (j.status === "queued" ||
            (j.status === "failed" && j.attempts < maxAttempts))
      )
      .slice(0, limit);
  }

  async save(job: DigestQueuedJob) {
    const idx = queue.findIndex((j) => j.job_id === job.job_id);
    if (idx >= 0) queue[idx] = job;
    else queue.push(job);
    return job;
  }

  async resetForTests(): Promise<void> {
    queue.length = 0;
    seq = 0;
  }
}
