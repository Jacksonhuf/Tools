import pg from "pg";
import type { RepricingActivityRepository } from "./repricing-activity-types.js";

export class PostgresRepricingActivityRepository
  implements RepricingActivityRepository
{
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async recordApply(listingId: string, at?: string): Promise<void> {
    const id = `ract-${Date.now()}`;
    await this.pool.query(
      `INSERT INTO repricing_activity (id, listing_id, created_at)
       VALUES ($1, $2, $3)`,
      [id, listingId, at ?? new Date().toISOString()]
    );
  }

  async lastApplyAt(listingId: string): Promise<string | null> {
    const res = await this.pool.query(
      `SELECT created_at FROM repricing_activity
       WHERE listing_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [listingId]
    );
    if (!res.rowCount) return null;
    return new Date(res.rows[0].created_at).toISOString();
  }

  async countAppliesSince(listingId: string, since: Date): Promise<number> {
    const res = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM repricing_activity
       WHERE listing_id = $1 AND created_at >= $2`,
      [listingId, since.toISOString()]
    );
    return Number(res.rows[0].c);
  }
}
