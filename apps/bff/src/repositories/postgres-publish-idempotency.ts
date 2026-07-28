import { Pool } from "pg";
import type { StoredPublishOutcome } from "../publish-idempotency-types.js";
import type { PublishIdempotencyRepository } from "./publish-idempotency-types.js";

export class PostgresPublishIdempotencyRepository
  implements PublishIdempotencyRepository
{
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async get(compositeKey: string): Promise<StoredPublishOutcome | undefined> {
    const r = await this.pool.query(
      `SELECT outcome_json FROM publish_idempotency WHERE composite_key = $1`,
      [compositeKey]
    );
    if (r.rowCount === 0) return undefined;
    return r.rows[0].outcome_json as StoredPublishOutcome;
  }

  async set(
    compositeKey: string,
    tenantId: string,
    outcome: StoredPublishOutcome
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO publish_idempotency (composite_key, tenant_id, outcome_json)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (composite_key) DO UPDATE SET outcome_json = EXCLUDED.outcome_json`,
      [compositeKey, tenantId, JSON.stringify(outcome)]
    );
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM publish_idempotency`);
  }
}
