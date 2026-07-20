import pg from "pg";
import type { CatalogRepository } from "./types.js";
import { rowToSku } from "./types.js";
import type { PriceVersionRecord, VersionState } from "../version-store.js";

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
      `SELECT id::text, sku_id, channel, state, publish_price_mxn, created_at
       FROM price_versions WHERE sku_id = $1 ORDER BY id`,
      [skuId]
    );
    return r.rows.map((row) => ({
      id: `ver-${row.id}`,
      sku_id: row.sku_id,
      channel: row.channel,
      state: row.state as VersionState,
      publish_price_mxn: Number(row.publish_price_mxn),
      created_at: new Date(row.created_at).toISOString(),
    }));
  }

  async createVersion(input: {
    tenant_id: string;
    sku_id: string;
    channel: string;
    state: VersionState;
    publish_price_mxn: number;
    reason?: string;
  }): Promise<PriceVersionRecord> {
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
        `INSERT INTO price_versions (tenant_id, sku_id, channel, state, publish_price_mxn, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          input.tenant_id,
          input.sku_id,
          input.channel,
          input.state,
          input.publish_price_mxn,
          input.reason ?? null,
        ]
      );
      await client.query("COMMIT");
      const row = ins.rows[0];
      return {
        id: `ver-${row.id}`,
        sku_id: input.sku_id,
        channel: input.channel,
        state: input.state,
        publish_price_mxn: input.publish_price_mxn,
        created_at: new Date(row.created_at).toISOString(),
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async countVersions(): Promise<number> {
    const r = await this.pool.query(`SELECT COUNT(*)::int AS c FROM price_versions`);
    return r.rows[0].c as number;
  }
}
