import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetTariffHsForTests } from "../../apps/bff/src/tariff-hs-table.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-UNIT-COST-002 HS landed cost API (Loop 70)", () => {
  beforeEach(() => {
    resetTariffHsForTests();
  });

  it("POST /skus/:id/landed-cost/from-hs matches GL-COST-002", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/landed-cost/from-hs",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ cogs_amount: 1000, cogs_currency: "MXN" }),
      }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      computed: { duty_mxn: number; landed_cost_mxn: number };
      tariff: { tariff_rate: number };
    };
    expect(json.tariff.tariff_rate).toBe(0.05);
    expect(json.computed.duty_mxn).toBe(50);
    expect(json.computed.landed_cost_mxn).toBe(1050);
  });

  it("GET /tariff-hs-rates lists demo HS rows", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/tariff-hs-rates", {
      headers: { ...AUTH, ...TENANT },
    });
    const json = (await res.json()) as {
      items: Array<{ hs_code: string }>;
    };
    expect(
      json.items.some((r) => r.hs_code === "HS-ELECTRONICS-MX")
    ).toBe(true);
  });
});

describe("P0-E5-04 adjustment preview (Loop 71)", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.catalog.resetForTests?.();
    t.adjustments.resetForTests?.();
  });

  async function seedPrice(
    app: ReturnType<typeof createTestApp>["app"],
    price: number
  ) {
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: price }),
    });
  }

  it("POST /adjustment-batches/preview does not persist", async () => {
    const { app, adjustments } = createTestApp();
    await seedPrice(app, 1600);
    const preview = await app.request("/api/v1/adjustment-batches/preview", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1600 }],
      }),
    });
    expect(preview.status).toBe(200);
    const body = (await preview.json()) as {
      status: string;
      items: Array<{ listing_id: string }>;
    };
    expect(body.status).toBe("draft");
    expect(body.items.length).toBe(1);
    const list = await adjustments.listBatches("tenant-demo");
    expect(list.length).toBe(0);
  });
});

describe("P0-E5-03 adjustment price CSV import (Loop 72)", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.catalog.resetForTests?.();
  });

  it("GET template and POST import preview", async () => {
    const { app } = createTestApp();
    const tpl = await app.request(
      "/api/v1/imports/adjustment-prices/template",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(tpl.status).toBe(200);
    const csv = await tpl.text();
    expect(csv).toContain("listing_id");
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1600 }),
    });
    const res = await app.request("/api/v1/imports/adjustment-prices", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ csv }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      preview: { items: Array<{ listing_id: string }> };
    };
    expect(json.preview.items.length).toBeGreaterThan(0);
  });
});

describe("pricing_snapshot_csv export (Loop 73)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports kind pricing_snapshot_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "pricing_snapshot_csv" }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    expect(dl.status).toBe(200);
    const text = await dl.text();
    expect(text).toContain("sku_id");
  });
});
