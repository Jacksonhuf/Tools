import pg from "pg";
import type {
  DynamicRuleRecord,
  DynamicRuleRepository,
  OffsetJson,
} from "./dynamic-rule-types.js";

function mapRule(row: Record<string, unknown>): DynamicRuleRecord {
  return {
    id: row.id as string,
    listing_id: row.listing_id as string,
    enabled: Boolean(row.enabled),
    action: row.action as DynamicRuleRecord["action"],
    anchor_type: row.anchor_type as string,
    offset: row.offset_json as OffsetJson,
    triggers_json: (row.triggers_json as Record<string, unknown>) ?? null,
    cooldown_min: Number(row.cooldown_min),
    daily_limit: Number(row.daily_limit),
    min_gap_mxn: Number(row.min_gap_mxn),
    tier: (row.tier as string) ?? null,
    frozen: Boolean(row.frozen),
    updated_at: new Date(row.updated_at as string).toISOString(),
  };
}

export class PostgresDynamicRuleRepository implements DynamicRuleRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async getRule(listingId: string): Promise<DynamicRuleRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, listing_id, enabled, action, anchor_type, offset_json, triggers_json,
              cooldown_min, daily_limit, min_gap_mxn, tier, frozen, updated_at
       FROM dynamic_repricing_rules WHERE listing_id = $1`,
      [listingId]
    );
    if (!res.rowCount) return undefined;
    return mapRule(res.rows[0]);
  }

  async upsertRule(
    listingId: string,
    patch: Partial<
      Omit<DynamicRuleRecord, "id" | "listing_id" | "updated_at">
    >
  ): Promise<DynamicRuleRecord> {
    const existing = await this.getRule(listingId);
    const merged = {
      enabled: patch.enabled ?? existing?.enabled ?? true,
      action: patch.action ?? existing?.action ?? "suggest",
      anchor_type: patch.anchor_type ?? existing?.anchor_type ?? "median",
      offset: patch.offset ?? existing?.offset ?? { type: "PERCENT", value: 0 },
      triggers_json: patch.triggers_json ?? existing?.triggers_json ?? null,
      cooldown_min: patch.cooldown_min ?? existing?.cooldown_min ?? 0,
      daily_limit: patch.daily_limit ?? existing?.daily_limit ?? 10,
      min_gap_mxn: patch.min_gap_mxn ?? existing?.min_gap_mxn ?? 5,
      tier: patch.tier ?? existing?.tier ?? null,
      frozen: patch.frozen ?? existing?.frozen ?? false,
    };
    const id = existing?.id ?? `drule-${listingId}`;
    const res = await this.pool.query(
      `INSERT INTO dynamic_repricing_rules
       (id, listing_id, enabled, action, anchor_type, offset_json, triggers_json,
        cooldown_min, daily_limit, min_gap_mxn, tier, frozen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (listing_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         action = EXCLUDED.action,
         anchor_type = EXCLUDED.anchor_type,
         offset_json = EXCLUDED.offset_json,
         triggers_json = EXCLUDED.triggers_json,
         cooldown_min = EXCLUDED.cooldown_min,
         daily_limit = EXCLUDED.daily_limit,
         min_gap_mxn = EXCLUDED.min_gap_mxn,
         tier = EXCLUDED.tier,
         frozen = EXCLUDED.frozen,
         updated_at = NOW()
       RETURNING id, listing_id, enabled, action, anchor_type, offset_json, triggers_json,
                 cooldown_min, daily_limit, min_gap_mxn, tier, frozen, updated_at`,
      [
        id,
        listingId,
        merged.enabled,
        merged.action,
        merged.anchor_type,
        JSON.stringify(merged.offset),
        merged.triggers_json ? JSON.stringify(merged.triggers_json) : null,
        merged.cooldown_min,
        merged.daily_limit,
        merged.min_gap_mxn,
        merged.tier,
        merged.frozen,
      ]
    );
    return mapRule(res.rows[0]);
  }

  async unfreeze(listingId: string): Promise<DynamicRuleRecord | undefined> {
    return this.upsertRule(listingId, { frozen: false });
  }
}

export class PostgresListingHealthRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async getStale(listingId: string) {
    const res = await this.pool.query(
      `SELECT competitor_stale_frozen, competitor_stale_since
       FROM listings WHERE id = $1`,
      [listingId]
    );
    if (!res.rowCount) {
      return { competitor_stale_frozen: false, competitor_stale_since: null };
    }
    const row = res.rows[0];
    return {
      competitor_stale_frozen: Boolean(row.competitor_stale_frozen),
      competitor_stale_since: row.competitor_stale_since
        ? new Date(row.competitor_stale_since).toISOString()
        : null,
    };
  }

  async setStale(
    listingId: string,
    frozen: boolean,
    since?: string | null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE listings SET competitor_stale_frozen = $2,
              competitor_stale_since = $3 WHERE id = $1`,
      [listingId, frozen, frozen ? (since ?? new Date().toISOString()) : null]
    );
  }

  async getIngestGuard(listingId: string) {
    const res = await this.pool.query(
      `SELECT ingest_failed, ingest_failed_at FROM listings WHERE id = $1`,
      [listingId]
    );
    if (!res.rowCount) {
      return { ingest_failed: false, ingest_failed_at: null };
    }
    const row = res.rows[0];
    return {
      ingest_failed: Boolean(row.ingest_failed),
      ingest_failed_at: row.ingest_failed_at
        ? new Date(row.ingest_failed_at).toISOString()
        : null,
    };
  }

  async setIngestFailed(listingId: string, failed: boolean): Promise<void> {
    await this.pool.query(
      `UPDATE listings SET ingest_failed = $2,
              ingest_failed_at = $3 WHERE id = $1`,
      [
        listingId,
        failed,
        failed ? new Date().toISOString() : null,
      ]
    );
  }
}
