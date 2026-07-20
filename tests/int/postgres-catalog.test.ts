import { describe, expect, it, beforeAll } from "vitest";
import { newDb } from "pg-mem";
import { runMigrations } from "@mx-pricing/db";
import { PostgresCatalogRepository } from "../../apps/bff/src/repositories/postgres-catalog.js";

describe("TC-INT-VER postgres catalog", () => {
  let repo: PostgresCatalogRepository;

  beforeAll(async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    const client = await pool.connect();
    await runMigrations("pg-mem", client);
    await client.query(
      `INSERT INTO skus (id, tenant_id, sku_code, name, landed_cost_mxn, policy_json, fee_ml_json, fee_amazon_json)
       VALUES ('demo-sku-001', 'tenant-demo', 'MX-DEMO-001', 'Demo', 1000,
       '{"pricing_mode":"cost","target_margin_pct":20,"min_margin_pct":10,"tax_strategy":"PRICE_EXCLUDES_IVA","iva_rate":0.16}',
       '{"commission_pct_of_price":18,"payment_pct_of_price":3,"fulfillment_fixed_mxn":40}',
       '{"commission_pct_of_price":15,"payment_pct_of_price":0,"fulfillment_fixed_mxn":55}')`
    );
    await client.query(
      `INSERT INTO listings (id, tenant_id, sku_id, channel) VALUES ('listing-ml-001', 'tenant-demo', 'demo-sku-001', 'MERCADO_LIBRE')`
    );
    client.release();
    repo = new PostgresCatalogRepository(pool);
  });

  it("loads SKU by tenant", async () => {
    const sku = await repo.getSku("tenant-demo", "demo-sku-001");
    expect(sku?.sku_code).toBe("MX-DEMO-001");
  });

  it("persists version and supersedes active", async () => {
    await repo.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 1500,
    });
    await repo.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 1600,
    });
    const versions = await repo.listVersions("demo-sku-001");
    expect(versions.filter((v) => v.state === "active")).toHaveLength(1);
    expect(versions.find((v) => v.state === "active")?.publish_price_mxn).toBe(
      1600
    );
  });
});
