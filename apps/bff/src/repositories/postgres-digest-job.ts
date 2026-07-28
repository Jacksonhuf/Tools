import { Pool } from "pg";
import type { DigestQueuedJob } from "../digest-job-queue-types.js";
import type { DigestJobRepository } from "./digest-job-types.js";

let seq = 0;

export class PostgresDigestJobRepository implements DigestJobRepository {
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async list(tenantId: string, limit = 20): Promise<DigestQueuedJob[]> {
    const r = await this.pool.query(
      `SELECT * FROM digest_jobs WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit]
    );
    return r.rows.map(rowToJob);
  }

  async get(tenantId: string, jobId: string) {
    const r = await this.pool.query(
      `SELECT * FROM digest_jobs WHERE tenant_id = $1 AND id = $2`,
      [tenantId, jobId]
    );
    if (r.rowCount === 0) return undefined;
    return rowToJob(r.rows[0]);
  }

  async listDeadLetter(tenantId: string, limit = 20) {
    const r = await this.pool.query(
      `SELECT * FROM digest_jobs
       WHERE tenant_id = $1 AND status = 'dead_letter'
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit]
    );
    return r.rows.map(rowToJob);
  }

  async summary(tenantId: string) {
    const r = await this.pool.query(
      `SELECT status, COUNT(*)::int AS c FROM digest_jobs
       WHERE tenant_id = $1 GROUP BY status`,
      [tenantId]
    );
    const counts = Object.fromEntries(
      r.rows.map((row) => [row.status as string, row.c as number])
    );
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      total,
      queued: counts.queued ?? 0,
      failed: counts.failed ?? 0,
      dead_letter: counts.dead_letter ?? 0,
    };
  }

  async enqueue(input: Parameters<DigestJobRepository["enqueue"]>[0]) {
    seq += 1;
    const now = new Date().toISOString();
    const job: DigestQueuedJob = {
      job_id: `digest-q-${Date.now()}-${seq}`,
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
    await this.insert(job);
    return job;
  }

  async listPending(tenantId: string, limit: number, maxAttempts: number) {
    const r = await this.pool.query(
      `SELECT * FROM digest_jobs
       WHERE tenant_id = $1
         AND (status = 'queued' OR (status = 'failed' AND attempts < $3))
       ORDER BY created_at ASC LIMIT $2`,
      [tenantId, limit, maxAttempts]
    );
    return r.rows.map(rowToJob);
  }

  async save(job: DigestQueuedJob) {
    await this.pool.query(
      `UPDATE digest_jobs SET
         status = $3,
         attempts = $4,
         last_error = $5,
         result_json = $6::jsonb,
         updated_at = $7,
         payload_json = $8::jsonb
       WHERE tenant_id = $1 AND id = $2`,
      [
        job.tenant_id,
        job.job_id,
        job.status,
        job.attempts,
        job.error,
        job.result ? JSON.stringify(job.result) : null,
        job.updated_at,
        JSON.stringify(job),
      ]
    );
    return job;
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM digest_jobs`);
    seq = 0;
  }

  private async insert(job: DigestQueuedJob) {
    await this.pool.query(
      `INSERT INTO digest_jobs
        (id, tenant_id, status, payload_json, attempts, last_error, locale, digest_date, channels_json, simulate_poison, result_json, created_at, updated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12,$13)`,
      [
        job.job_id,
        job.tenant_id,
        job.status,
        JSON.stringify(job),
        job.attempts,
        job.error,
        job.locale,
        job.date,
        JSON.stringify(job.channels),
        job.simulate_poison ?? false,
        null,
        job.created_at,
        job.updated_at,
      ]
    );
  }
}

function rowToJob(row: Record<string, unknown>): DigestQueuedJob {
  if (row.payload_json && typeof row.payload_json === "object") {
    return row.payload_json as DigestQueuedJob;
  }
  return {
    job_id: row.id as string,
    tenant_id: row.tenant_id as string,
    locale: (row.locale as DigestQueuedJob["locale"]) ?? "en",
    date: (row.digest_date as string | null) ?? null,
    channels: (row.channels_json as DigestQueuedJob["channels"]) ?? [
      "email_stub",
    ],
    status: row.status as DigestQueuedJob["status"],
    attempts: Number(row.attempts ?? 0),
    simulate_poison: Boolean(row.simulate_poison),
    created_at: new Date(row.created_at as string).toISOString(),
    updated_at: new Date(row.updated_at as string).toISOString(),
    error: (row.last_error as string | null) ?? null,
    result: (row.result_json as DigestQueuedJob["result"]) ?? null,
  };
}
