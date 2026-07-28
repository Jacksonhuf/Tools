import { Pool } from "pg";
import type { WorkerHeartbeat } from "../worker-heartbeat-types.js";
import type { WorkerHeartbeatRepository } from "./worker-heartbeat-types.js";

export class PostgresWorkerHeartbeatRepository
  implements WorkerHeartbeatRepository
{
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async record(input: {
    worker_id: string;
    tenant_id?: string;
    details?: Record<string, unknown>;
  }): Promise<WorkerHeartbeat> {
    const beat: WorkerHeartbeat = {
      worker_id: input.worker_id,
      reported_at: new Date().toISOString(),
      details: input.details,
      tenant_id: input.tenant_id ?? null,
    };
    await this.pool.query(
      `INSERT INTO worker_heartbeats (worker_id, tenant_id, reported_at, details_json)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (worker_id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         reported_at = EXCLUDED.reported_at,
         details_json = EXCLUDED.details_json`,
      [
        beat.worker_id,
        beat.tenant_id,
        beat.reported_at,
        JSON.stringify(beat.details ?? {}),
      ]
    );
    return beat;
  }

  async list(): Promise<WorkerHeartbeat[]> {
    const r = await this.pool.query(
      `SELECT worker_id, tenant_id, reported_at, details_json
       FROM worker_heartbeats ORDER BY reported_at DESC`
    );
    return r.rows.map((row) => ({
      worker_id: row.worker_id as string,
      tenant_id: (row.tenant_id as string | null) ?? null,
      reported_at: new Date(row.reported_at as string).toISOString(),
      details: (row.details_json as Record<string, unknown> | null) ?? undefined,
    }));
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM worker_heartbeats`);
  }
}
