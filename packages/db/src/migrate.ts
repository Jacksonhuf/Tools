import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations"
);

export async function runMigrations(
  connectionString: string,
  client?: pg.ClientBase
): Promise<void> {
  const owned = !client;
  const c =
    client ?? new pg.Client({ connectionString });
  if (owned) await (c as pg.Client).connect();

  try {
    await c.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const id = file;
      const applied = await c.query(
        "SELECT 1 FROM schema_migrations WHERE id = $1",
        [id]
      );
      if (applied.rowCount && applied.rowCount > 0) continue;
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      await c.query("BEGIN");
      try {
        await c.query(sql);
        await c.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    if (owned) {
      await (c as pg.Client).end();
    } else if ("release" in c) {
      (c as pg.PoolClient).release();
    }
  }
}

export async function seedDemoData(connectionString: string): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const exists = await client.query(
      "SELECT 1 FROM skus WHERE id = $1",
      ["demo-sku-001"]
    );
    if (exists.rowCount && exists.rowCount > 0) return;

    const policy = {
      pricing_mode: "competitive_with_floor",
      target_margin_pct: 20,
      min_margin_pct: 10,
      tax_strategy: "PRICE_EXCLUDES_IVA",
      iva_rate: 0.16,
    };
    const fee_ml = {
      commission_pct_of_price: 18,
      payment_pct_of_price: 3,
      fulfillment_fixed_mxn: 40,
    };
    const fee_amazon = {
      commission_pct_of_price: 15,
      payment_pct_of_price: 0,
      fulfillment_fixed_mxn: 55,
    };

    await client.query(
      `INSERT INTO skus (id, tenant_id, sku_code, name, landed_cost_mxn, policy_json, fee_ml_json, fee_amazon_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "demo-sku-001",
        "tenant-demo",
        "MX-DEMO-001",
        "Demo Cross-Border SKU",
        1000,
        JSON.stringify(policy),
        JSON.stringify(fee_ml),
        JSON.stringify(fee_amazon),
      ]
    );
    await client.query(
      `INSERT INTO listings (id, tenant_id, sku_id, channel) VALUES ($1, $2, $3, $4)`,
      ["listing-ml-001", "tenant-demo", "demo-sku-001", "MERCADO_LIBRE"]
    );
    await client.query(
      `INSERT INTO listings (id, tenant_id, sku_id, channel) VALUES ($1, $2, $3, $4)`,
      ["listing-amz-001", "tenant-demo", "demo-sku-001", "AMAZON_MX"]
    );
    await client.query(
      `INSERT INTO shops (id, tenant_id, channel, name) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      ["shop-ml-demo", "tenant-demo", "MERCADO_LIBRE", "Demo ML Shop"]
    );
    await client.query(
      `INSERT INTO shops (id, tenant_id, channel, name) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      ["shop-amz-demo", "tenant-demo", "AMAZON_MX", "Demo Amazon MX"]
    );
  } finally {
    await client.end();
  }
}
