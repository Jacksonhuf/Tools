import pg from "pg";
import type {
  IngestScheduleRecord,
  RepricingEventRecord,
  RepricingRepository,
} from "./repricing-types.js";

function mapEvent(row: Record<string, unknown>): RepricingEventRecord {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    listing_id: row.listing_id as string,
    channel: row.channel as string,
    type: row.type as string,
    status: row.status as RepricingEventRecord["status"],
    payload: row.payload_json as Record<string, unknown>,
    dedupe_key: (row.dedupe_key as string) ?? null,
    processed_at: row.processed_at
      ? new Date(row.processed_at as string).toISOString()
      : null,
    created_at: new Date(row.created_at as string).toISOString(),
  };
}

export class PostgresRepricingRepository implements RepricingRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async enqueueEvent(input: {
    tenant_id: string;
    listing_id: string;
    channel: string;
    type: string;
    payload: Record<string, unknown>;
    dedupe_key?: string;
  }): Promise<RepricingEventRecord> {
    if (input.dedupe_key) {
      const dup = await this.pool.query(
        `SELECT id, tenant_id, listing_id, channel, type, status, payload_json,
                dedupe_key, processed_at, created_at
         FROM repricing_events WHERE dedupe_key = $1`,
        [input.dedupe_key]
      );
      if (dup.rowCount) {
        return mapEvent(dup.rows[0]);
      }
    }
    const id = `revt-${Date.now()}`;
    const res = await this.pool.query(
      `INSERT INTO repricing_events
       (id, tenant_id, listing_id, channel, type, payload_json, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, listing_id, channel, type, status, payload_json,
                 dedupe_key, processed_at, created_at`,
      [
        id,
        input.tenant_id,
        input.listing_id,
        input.channel,
        input.type,
        JSON.stringify(input.payload),
        input.dedupe_key ?? null,
      ]
    );
    return mapEvent(res.rows[0]);
  }

  async getEvent(eventId: string): Promise<RepricingEventRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, tenant_id, listing_id, channel, type, status, payload_json,
              dedupe_key, processed_at, created_at
       FROM repricing_events WHERE id = $1`,
      [eventId]
    );
    if (!res.rowCount) return undefined;
    return mapEvent(res.rows[0]);
  }

  async listEvents(
    tenantId: string,
    listingId: string,
    limit = 50
  ): Promise<RepricingEventRecord[]> {
    const res = await this.pool.query(
      `SELECT id, tenant_id, listing_id, channel, type, status, payload_json,
              dedupe_key, processed_at, created_at
       FROM repricing_events
       WHERE tenant_id = $1 AND listing_id = $2
       ORDER BY created_at DESC LIMIT $3`,
      [tenantId, listingId, limit]
    );
    return res.rows.map(mapEvent);
  }

  async markProcessed(
    eventId: string,
    dedupe_key: string
  ): Promise<RepricingEventRecord | undefined> {
    const res = await this.pool.query(
      `UPDATE repricing_events
       SET status = 'processed', dedupe_key = $2, processed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, tenant_id, listing_id, channel, type, status, payload_json,
                 dedupe_key, processed_at, created_at`,
      [eventId, dedupe_key]
    );
    if (!res.rowCount) {
      return this.getEvent(eventId);
    }
    return mapEvent(res.rows[0]);
  }

  async getIngestSchedule(
    listingId: string
  ): Promise<IngestScheduleRecord | undefined> {
    const res = await this.pool.query(
      `SELECT listing_id, tier, next_run_at, updated_at
       FROM listing_ingest_schedules WHERE listing_id = $1`,
      [listingId]
    );
    if (!res.rowCount) return undefined;
    const row = res.rows[0];
    return {
      listing_id: row.listing_id,
      tier: row.tier,
      next_run_at: new Date(row.next_run_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async upsertIngestSchedule(input: {
    listing_id: string;
    tier: "T0" | "T1" | "T2";
    next_run_at: string;
  }): Promise<IngestScheduleRecord> {
    const res = await this.pool.query(
      `INSERT INTO listing_ingest_schedules (listing_id, tier, next_run_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (listing_id) DO UPDATE SET
         tier = EXCLUDED.tier,
         next_run_at = EXCLUDED.next_run_at,
         updated_at = NOW()
       RETURNING listing_id, tier, next_run_at, updated_at`,
      [input.listing_id, input.tier, input.next_run_at]
    );
    const row = res.rows[0];
    return {
      listing_id: row.listing_id,
      tier: row.tier,
      next_run_at: new Date(row.next_run_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }
}
