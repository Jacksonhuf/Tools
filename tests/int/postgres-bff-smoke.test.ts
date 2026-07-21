import { describe, expect, it, beforeAll } from "vitest";
import { runMigrations, seedDemoData } from "@mx-pricing/db";
import { createApp } from "../../apps/bff/src/app.js";
import { PostgresCatalogRepository } from "../../apps/bff/src/repositories/postgres-catalog.js";

const DATABASE_URL = process.env.DATABASE_URL;
const RUN_PG =
  process.env.RUN_PG_INTEGRATION === "1" || process.env.RUN_PG_INTEGRATION === "true";
const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

/**
 * TC-INT-PG-001 — BFF reads catalog + persists versions when DATABASE_URL is set.
 * CI: `.github/workflows/ci-postgres-int.yml`
 */
describe.skipIf(!RUN_PG || !DATABASE_URL)("TC-INT-PG BFF postgres path", () => {
  let catalog: PostgresCatalogRepository;

  beforeAll(async () => {
    await runMigrations(DATABASE_URL!);
    await seedDemoData(DATABASE_URL!);
    catalog = new PostgresCatalogRepository(DATABASE_URL!);
  });

  it("GET pricing-context loads SKU from PostgreSQL", async () => {
    const app = createApp({ catalog });
    const res = await app.request("/api/v1/skus/demo-sku-001/pricing-context", {
      headers: { ...AUTH, ...TENANT, "Accept-Language": "en" },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { sku_id: string; channels: unknown[] };
    expect(json.sku_id).toBe("demo-sku-001");
    expect(json.channels.length).toBeGreaterThanOrEqual(2);
  });

  it("POST price-version persists active version in PostgreSQL", async () => {
    const app = createApp({ catalog });
    const post = await app.request(
      "/api/v1/listings/listing-ml-001/price-versions",
      {
        method: "POST",
        headers: {
          ...AUTH,
          ...TENANT,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ explicit_price_mxn: 1755 }),
      }
    );
    expect(post.status).toBe(201);
    const versions = await catalog.listVersions("demo-sku-001");
    const activeMl = versions.filter(
      (v) => v.channel === "MERCADO_LIBRE" && v.state === "active"
    );
    expect(activeMl.length).toBe(1);
    expect(activeMl[0]?.publish_price_mxn).toBe(1755);
  });
});
