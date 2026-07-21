import pg from "pg";
import type { CatalogRepository, CreateVersionParams } from "./types.js";
import { rowToSku } from "./types.js";
import type { PriceVersionRecord, VersionState } from "../version-store.js";

function mapVersionRow(row: Record<string, unknown>): PriceVersionRecord {
  return {
    id: `ver-${row.id}`,
    sku_id: row.sku_id as string,
    channel: row.channel as string,
    state: row.state as VersionState,
    publish_price_mxn: Number(row.publish_price_mxn),
    created_at: new Date(row.created_at as string).toISOString(),
    trigger_event_id: (row.trigger_event_id as string) ?? null,
    dynamic_rule_id: (row.dynamic_rule_id as string) ?? null,
    competitor_snapshot_ids: (row.competitor_snapshot_ids as string[]) ?? [],
    floor_snapshot_id: (row.floor_snapshot_id as string) ?? null,
    cost_snapshot_id: (row.cost_snapshot_id as string) ?? null,
  };
}

export class PostgresCatalogRepository implements CatalogRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionStringOrPool: string | pg.Pool) {
    this.pool =
      typeof connectionStringOrPool === "string"
        ? new pg.Pool({ connectionString: connectionStringOrPool })
        : connectionStringOrPool;
  }

  async getSku(tenantId: string, skuId: string) {
    const r = await this.pool.query(
      `SELECT * FROM skus WHERE tenant_id = $1 AND id = $2`,
      [tenantId, skuId]
    );
    if (r.rowCount === 0) return undefined;
    return rowToSku(r.rows[0]);
  }

  async getListing(tenantId: string, listingId: string) {
    const r = await this.pool.query(
      `SELECT l.id AS listing_id, l.sku_id, l.channel,
              s.id, s.tenant_id, s.sku_code, s.name, s.landed_cost_mxn,
              s.policy_json, s.fee_ml_json, s.fee_amazon_json
       FROM listings l
       JOIN skus s ON s.id = l.sku_id
       WHERE l.tenant_id = $1 AND l.id = $2`,
      [tenantId, listingId]
    );
    if (r.rowCount === 0) return undefined;
    const row = r.rows[0];
    const sku = rowToSku(row);
    return {
      id: row.listing_id as string,
      sku_id: row.sku_id as string,
      channel: row.channel as "MERCADO_LIBRE" | "AMAZON_MX",
      sku,
    };
  }

  async listVersions(skuId: string): Promise<PriceVersionRecord[]> {
    const r = await this.pool.query(
      `SELECT id::text, sku_id, channel, state, publish_price_mxn, created_at,
              trigger_event_id, dynamic_rule_id, competitor_snapshot_ids,
              floor_snapshot_id, cost_snapshot_id
       FROM price_versions WHERE sku_id = $1 ORDER BY id`,
      [skuId]
    );
    return r.rows.map((row) => mapVersionRow(row));
  }

  async getVersion(
    tenantId: string,
    versionId: string
  ): Promise<PriceVersionRecord | undefined> {
    const numericId = versionId.replace(/^ver-/, "");
    const r = await this.pool.query(
      `SELECT v.id::text, v.sku_id, v.channel, v.state, v.publish_price_mxn, v.created_at,
              v.trigger_event_id, v.dynamic_rule_id, v.competitor_snapshot_ids,
              v.floor_snapshot_id, v.cost_snapshot_id
       FROM price_versions v
       JOIN skus s ON s.id = v.sku_id
       WHERE v.id = $1 AND s.tenant_id = $2`,
      [numericId, tenantId]
    );
    if (r.rowCount === 0) return undefined;
    return mapVersionRow(r.rows[0]);
  }

  async createVersion(input: CreateVersionParams): Promise<PriceVersionRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (input.state === "active") {
        await client.query(
          `UPDATE price_versions SET state = 'superseded'
           WHERE sku_id = $1 AND channel = $2 AND state = 'active'`,
          [input.sku_id, input.channel]
        );
      }
      const ins = await client.query(
        `INSERT INTO price_versions (
           tenant_id, sku_id, channel, state, publish_price_mxn, reason,
           trigger_event_id, dynamic_rule_id, competitor_snapshot_ids,
           floor_snapshot_id, cost_snapshot_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, created_at, sku_id, channel, state, publish_price_mxn,
                   trigger_event_id, dynamic_rule_id, competitor_snapshot_ids,
                   floor_snapshot_id, cost_snapshot_id`,
        [
          input.tenant_id,
          input.sku_id,
          input.channel,
          input.state,
          input.publish_price_mxn,
          input.reason ?? null,
          input.trigger_event_id ?? null,
          input.dynamic_rule_id ?? null,
          input.competitor_snapshot_ids ?? [],
          input.floor_snapshot_id ?? null,
          input.cost_snapshot_id ?? null,
        ]
      );
      await client.query("COMMIT");
      const row = ins.rows[0];
      return {
        ...mapVersionRow(row),
        created_at: new Date(row.created_at).toISOString(),
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async updateVersionState(
    versionId: string,
    expectedState: VersionState,
    newState: VersionState
  ): Promise<PriceVersionRecord | undefined> {
    const numericId = versionId.replace(/^ver-/, "");
    const r = await this.pool.query(
      `UPDATE price_versions
       SET state = $3
       WHERE id = $1 AND state = $2
       RETURNING id::text, sku_id, channel, state, publish_price_mxn, created_at`,
      [numericId, expectedState, newState]
    );
    if (r.rowCount === 0) return undefined;
    const row = r.rows[0];
    return {
      id: `ver-${row.id}`,
      sku_id: row.sku_id,
      channel: row.channel,
      state: row.state as VersionState,
      publish_price_mxn: Number(row.publish_price_mxn),
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  async setVersionChannelPublishStatus(
    _versionId: string,
    _status: PriceVersionRecord["channel_publish_status"]
  ): Promise<void> {
    /* channel_publish_status column not in migration yet — no-op for postgres */
  }

  async countVersions(): Promise<number> {
    const r = await this.pool.query(`SELECT COUNT(*)::int AS c FROM price_versions`);
    return r.rows[0].c as number;
  }

  async listSkus(tenantId: string): Promise<import("../fixtures.js").SkuRecord[]> {
    const r = await this.pool.query(
      `SELECT * FROM skus WHERE tenant_id = $1 ORDER BY sku_code`,
      [tenantId]
    );
    return r.rows.map((row) => rowToSku(row));
  }

  async updateSkuLandedCost(
    tenantId: string,
    skuId: string,
    landed_cost_mxn: number
  ) {
    const r = await this.pool.query(
      `UPDATE skus SET landed_cost_mxn = $3
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      [tenantId, skuId, landed_cost_mxn]
    );
    if (r.rowCount === 0) return undefined;
    return rowToSku(r.rows[0]);
  }
}
