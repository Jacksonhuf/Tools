import pg from "pg";
import type {
  RepricingBatchJobStatus,
  RepricingBatchQueuedJob,
} from "../repricing-batch-job-types.js";
import type { RepricingBatchJobStore } from "./repricing-batch-job-store-types.js";

function mapRow(row: Record<string, unknown>): RepricingBatchQueuedJob {
  return {
    job_id: row.job_id as string,
    tenant_id: row.tenant_id as string,
    scope: row.scope as RepricingBatchQueuedJob["scope"],
    sku_id: (row.sku_id as string) ?? null,
    shard_total: Number(row.shard_total),
    sku_ids: Array.isArray(row.sku_ids_json)
      ? (row.sku_ids_json as string[])
      : null,
    status: row.status as RepricingBatchJobStatus,
    created_at: new Date(row.created_at as string).toISOString(),
    updated_at: new Date(row.updated_at as string).toISOString(),
    error: (row.error as string) ?? null,
    result: row.result_json ?? null,
    lease_holder: (row.lease_holder as string) ?? null,
    lease_expires_at: row.lease_expires_at
      ? new Date(row.lease_expires_at as string).toISOString()
      : null,
  };
}

export class PostgresRepricingBatchJobStore implements RepricingBatchJobStore {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionOrPool: string | pg.Pool) {
    this.pool =
      typeof connectionOrPool === "string"
        ? new pg.Pool({ connectionString: connectionOrPool })
        : connectionOrPool;
  }

  async enqueue(
    input: Parameters<RepricingBatchJobStore["enqueue"]>[0]
  ): Promise<RepricingBatchQueuedJob> {
    if (input.scope === "sku" && !input.sku_id?.trim()) {
      throw new Error("SKU_ID_REQUIRED");
    }
    const jobId = `repricing-batch-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await this.pool.query(
      `INSERT INTO repricing_batch_jobs
       (job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued')
       RETURNING job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
                 status, error, result_json, created_at, updated_at`,
      [
        jobId,
        input.tenant_id,
        input.scope,
        input.scope === "sku" ? input.sku_id!.trim() : null,
        input.shard_total,
        input.sku_ids?.length ? JSON.stringify(input.sku_ids) : null,
      ]
    );
    return mapRow(res.rows[0]);
  }

  async list(tenantId: string, limit: number): Promise<RepricingBatchQueuedJob[]> {
    const res = await this.pool.query(
      `SELECT job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
              status, error, result_json, created_at, updated_at
       FROM repricing_batch_jobs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );
    return res.rows.map(mapRow);
  }

  async get(
    tenantId: string,
    jobId: string
  ): Promise<RepricingBatchQueuedJob | undefined> {
    const res = await this.pool.query(
      `SELECT job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
              status, error, result_json, created_at, updated_at
       FROM repricing_batch_jobs WHERE job_id = $1 AND tenant_id = $2`,
      [jobId, tenantId]
    );
    if (!res.rowCount) return undefined;
    return mapRow(res.rows[0]);
  }

  async claimQueued(
    tenantId: string,
    limit: number,
    options?: { worker_id?: string; lease_sec?: number }
  ): Promise<RepricingBatchQueuedJob[]> {
    const leaseSec = options?.lease_sec ?? 300;
    const workerId = options?.worker_id ?? "bff-worker";
    const sel = await this.pool.query(
      `SELECT job_id FROM repricing_batch_jobs
       WHERE tenant_id = $1 AND (
         status = 'queued'
         OR (status = 'processing' AND lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
       )
       ORDER BY created_at ASC
       LIMIT $2`,
      [tenantId, limit]
    );
    const claimed: RepricingBatchQueuedJob[] = [];
    for (const row of sel.rows) {
      const upd = await this.pool.query(
        `UPDATE repricing_batch_jobs
         SET status = 'processing',
             updated_at = NOW(),
             lease_holder = $3,
             lease_expires_at = NOW() + ($4::text || ' seconds')::interval
         WHERE job_id = $1 AND tenant_id = $2
         RETURNING job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
                   status, error, result_json, created_at, updated_at,
                   lease_holder, lease_expires_at`,
        [row.job_id, tenantId, workerId, String(leaseSec)]
      );
      if (upd.rowCount) {
        claimed.push(mapRow(upd.rows[0]));
      }
    }
    return claimed;
  }

  async save(job: RepricingBatchQueuedJob): Promise<void> {
    await this.pool.query(
      `UPDATE repricing_batch_jobs
       SET status = $3, error = $4, result_json = $5,
           lease_holder = NULL, lease_expires_at = NULL, updated_at = NOW()
       WHERE job_id = $1 AND tenant_id = $2`,
      [
        job.job_id,
        job.tenant_id,
        job.status,
        job.error,
        job.result != null ? JSON.stringify(job.result) : null,
      ]
    );
  }

  async summary(tenantId: string) {
    const res = await this.pool.query(
      `SELECT
         COUNT(*)::int AS total,
         SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END)::int AS queued,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed
       FROM repricing_batch_jobs WHERE tenant_id = $1`,
      [tenantId]
    );
    const row = res.rows[0];
    return {
      total: Number(row.total),
      queued: Number(row.queued ?? 0),
      failed: Number(row.failed ?? 0),
    };
  }
}
