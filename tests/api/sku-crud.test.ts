import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("P0-E2-01 SKU API", () => {
  beforeEach(() => {
    const { catalog } = createTestApp();
    catalog.resetForTests?.();
  });

  it("GET /api/v1/skus lists tenant skus", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ sku_code: string }> };
    expect(json.items.length).toBeGreaterThan(0);
    expect(json.items[0].sku_code).toBe("MX-DEMO-001");
  });

  it("PATCH /api/v1/skus/:id updates landed cost", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus/demo-sku-001", {
      method: "PATCH",
      headers: { ...AUTH, ...TENANT, "Content-Type": "application/json" },
      body: JSON.stringify({ landed_cost_mxn: 1100 }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { landed_cost_mxn: number };
    expect(json.landed_cost_mxn).toBe(1100);
  });
});

describe("Amazon listing publish", () => {
  it("accepts listing-amz-001", async () => {
    const { app, catalog } = createTestApp();
    catalog.resetForTests?.();
    const res = await app.request("/api/v1/listings/listing-amz-001/price-versions", {
      method: "POST",
      headers: { ...AUTH, ...TENANT, "Content-Type": "application/json" },
      body: JSON.stringify({ explicit_price_mxn: 1650 }),
    });
    expect(res.status).toBe(200);
  });
});
