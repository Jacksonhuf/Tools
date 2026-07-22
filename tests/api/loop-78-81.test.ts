import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetCostSheetsForTests } from "../../apps/bff/src/cost-sheet-store.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("P0-E5-03 waterfall CSV export (Loop 78)", () => {
  it("GET /skus/:id/waterfall/export returns CSV layers", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/waterfall/export?channel=MERCADO_LIBRE&pricing_mode=cost&target_margin_pct=20",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("LANDED");
    expect(text).toContain("LIST_PRICE");
  });
});

describe("cost sheet CSV import (Loop 79)", () => {
  beforeEach(() => {
    resetCostSheetsForTests();
  });

  it("POST /imports/cost-sheets creates sheets", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/imports/cost-sheets", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        csv: "sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn\ndemo-sku-001,B-IMP,900,MXN,0\n",
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      created: Array<{ cost_sheet_id: string }>;
    };
    expect(json.created.length).toBe(1);
  });
});

describe("P0-E6-08 SKU policy patch (Loop 80)", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.catalog.resetForTests?.();
  });

  it("PATCH /skus/:id/policy updates margins", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus/demo-sku-001/policy", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ target_margin_pct: 22, min_margin_pct: 12 }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      policy: { target_margin_pct: number; min_margin_pct: number };
    };
    expect(json.policy.target_margin_pct).toBe(22);
    expect(json.policy.min_margin_pct).toBe(12);
  });
});

describe("P1-E2-04 listing sync jobs (Loop 81)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
  });

  it("POST /listings/:id/sync records job", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1650);
    const res = await app.request("/api/v1/listings/listing-ml-001/sync", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      job: { status: string };
      snapshot: { price_mxn: number };
    };
    expect(json.job.status).toBe("ok");
    expect(json.snapshot.price_mxn).toBeGreaterThan(0);
    const jobs = await app.request(
      "/api/v1/listings/listing-ml-001/sync/jobs",
      { headers: { ...AUTH, ...TENANT } }
    );
    const list = (await jobs.json()) as { items: unknown[] };
    expect(list.items.length).toBeGreaterThan(0);
  });
});
