import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetCostSheetsForTests } from "../../apps/bff/src/cost-sheet-store.js";
import { resetTariffHsForTests } from "../../apps/bff/src/tariff-hs-table.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("P0-E2-02 cost sheets (Loop 74)", () => {
  beforeEach(() => {
    resetCostSheetsForTests();
  });

  it("POST then GET /skus/:id/cost-sheets", async () => {
    const { app } = createTestApp();
    const post = await app.request(
      "/api/v1/skus/demo-sku-001/cost-sheets",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          batch_no: "BATCH-2026-01",
          cogs_amount: 1000,
          cogs_currency: "MXN",
          freight_alloc_mxn: 0,
        }),
      }
    );
    expect(post.status).toBe(201);
    const sheet = (await post.json()) as { id: string; batch_no: string };
    const list = await app.request(
      "/api/v1/skus/demo-sku-001/cost-sheets",
      { headers: { ...AUTH, ...TENANT } }
    );
    const json = (await list.json()) as { items: Array<{ id: string }> };
    expect(json.items.some((r) => r.id === sheet.id)).toBe(true);
  });
});

describe("P0-E2-05 landed from cost sheet (Loop 75)", () => {
  beforeEach(() => {
    resetCostSheetsForTests();
    resetTariffHsForTests();
  });

  it("POST /landed-cost/from-cost-sheet applies GL-COST-002 duty", async () => {
    const { app } = createTestApp();
    const post = await app.request(
      "/api/v1/skus/demo-sku-001/cost-sheets",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          batch_no: "BATCH-DUTY",
          cogs_amount: 1000,
          cogs_currency: "MXN",
        }),
      }
    );
    const sheet = (await post.json()) as { id: string };
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/landed-cost/from-cost-sheet",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ cost_sheet_id: sheet.id, apply: true }),
      }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      computed: { landed_cost_mxn: number };
      sku: { landed_cost_mxn: number };
    };
    expect(json.computed.landed_cost_mxn).toBe(1050);
    expect(json.sku.landed_cost_mxn).toBe(1050);
  });
});

describe("P0-E5-03 adjustment CSV apply (Loop 76)", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.catalog.resetForTests?.();
    t.adjustments.resetForTests?.();
  });

  it("POST /imports/adjustment-prices?apply creates batch", async () => {
    const { app, adjustments } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1600 }),
    });
    const res = await app.request("/api/v1/imports/adjustment-prices", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        csv: "listing_id,explicit_price_mxn\nlisting-ml-001,1600\n",
        apply: true,
      }),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { batch: { id: string } };
    const list = await adjustments.listBatches("tenant-demo");
    expect(list.some((b) => b.id === json.batch.id)).toBe(true);
  });
});

describe("freight alloc rule enum (Loop 77)", () => {
  beforeEach(() => {
    resetCostSheetsForTests();
  });

  it("cost sheet accepts WEIGHT_BASED rule", async () => {
    const { app } = createTestApp();
    const post = await app.request(
      "/api/v1/skus/demo-sku-001/cost-sheets",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          batch_no: "B-W",
          cogs_amount: 50,
          cogs_currency: "USD",
          freight_alloc_rule: "WEIGHT_BASED",
          freight_alloc_mxn: 120,
        }),
      }
    );
    expect(post.status).toBe(201);
    const sheet = (await post.json()) as { freight_alloc_rule: string };
    expect(sheet.freight_alloc_rule).toBe("WEIGHT_BASED");
  });
});
