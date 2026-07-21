import pg from "pg";
import {
  decryptSecret,
  encryptSecret,
} from "../shop-credential-crypto.js";
import type { ShopRecord, ShopRepository } from "./shop-types.js";
import type { SalesChannel } from "@mx-pricing/channel-adapters";

function rowToShop(row: {
  id: string;
  tenant_id: string;
  channel: string;
  name: string;
  external_seller_id: string | null;
  auth_status: string;
  token_expires_at: Date | null;
  created_at: Date;
}): ShopRecord {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    channel: row.channel as SalesChannel,
    name: row.name,
    external_seller_id: row.external_seller_id,
    auth_status: row.auth_status as ShopRecord["auth_status"],
    token_expires_at: row.token_expires_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  };
}

export class PostgresShopRepository implements ShopRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async listShops(tenantId: string): Promise<ShopRecord[]> {
    const res = await this.pool.query(
      `SELECT id, tenant_id, channel, name, external_seller_id, auth_status,
              token_expires_at, created_at
       FROM shops WHERE tenant_id = $1 ORDER BY created_at`,
      [tenantId]
    );
    return res.rows.map(rowToShop);
  }

  async getShop(
    tenantId: string,
    shopId: string
  ): Promise<ShopRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, tenant_id, channel, name, external_seller_id, auth_status,
              token_expires_at, created_at
       FROM shops WHERE tenant_id = $1 AND id = $2`,
      [tenantId, shopId]
    );
    if (!res.rowCount) return undefined;
    return rowToShop(res.rows[0]);
  }

  async createShop(input: {
    tenant_id: string;
    channel: SalesChannel;
    name: string;
    external_seller_id?: string;
  }): Promise<ShopRecord> {
    const id = `shop-${Date.now()}`;
    const res = await this.pool.query(
      `INSERT INTO shops (id, tenant_id, channel, name, external_seller_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, channel, name, external_seller_id, auth_status,
                 token_expires_at, created_at`,
      [
        id,
        input.tenant_id,
        input.channel,
        input.name,
        input.external_seller_id ?? null,
      ]
    );
    return rowToShop(res.rows[0]);
  }

  async setAuthConnected(
    tenantId: string,
    shopId: string,
    input: {
      external_seller_id: string;
      access_token: string;
      refresh_token?: string;
      token_expires_at: string;
    }
  ): Promise<ShopRecord | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const shopRes = await client.query(
        `UPDATE shops SET external_seller_id = $3, auth_status = 'connected',
                token_expires_at = $4
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, channel, name, external_seller_id, auth_status,
                   token_expires_at, created_at`,
        [tenantId, shopId, input.external_seller_id, input.token_expires_at]
      );
      if (!shopRes.rowCount) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await client.query(
        `INSERT INTO shop_credentials (shop_id, access_token_ciphertext, refresh_token_ciphertext)
         VALUES ($1, $2, $3)
         ON CONFLICT (shop_id) DO UPDATE SET
           access_token_ciphertext = EXCLUDED.access_token_ciphertext,
           refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
           updated_at = NOW()`,
        [
          shopId,
          encryptSecret(input.access_token),
          input.refresh_token ? encryptSecret(input.refresh_token) : null,
        ]
      );
      await client.query("COMMIT");
      return rowToShop(shopRes.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async getAccessToken(shopId: string): Promise<string | undefined> {
    const res = await this.pool.query(
      `SELECT access_token_ciphertext FROM shop_credentials WHERE shop_id = $1`,
      [shopId]
    );
    if (!res.rowCount) return undefined;
    return decryptSecret(res.rows[0].access_token_ciphertext);
  }
}
