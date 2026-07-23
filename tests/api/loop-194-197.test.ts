import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("pricing snapshot row CSV (Loop 194)", () => {
  it("GET /reports/pricing-snapshots/:skuId/rows/:channel/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/reports/pricing-snapshots/demo-sku-001/rows/MERCADO_LIBRE/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("demo-sku-001");
    expect(text).toContain("MERCADO_LIBRE");
  });
});

describe("cross-channel dashboard row CSV (Loop 195)", () => {
  it("GET /cross-channel/dashboard/:skuId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/cross-channel/dashboard/demo-sku-001/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("demo-sku-001");
  });
});

describe("competitor curve point CSV (Loop 196)", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
  });

  it("GET /listings/:id/competitors/curve/:date/export", async () => {
    const { app } = createTestApp();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-CURVE-196" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    const day = new Date().toISOString().slice(0, 10);
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        sale_price: 1500,
        observed_at: `${day}T12:00:00.000Z`,
      }),
    });
    const res = await app.request(
      `/api/v1/listings/listing-ml-001/competitors/curve/${day}/export?range=7d`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(day);
  });
});

describe("agent tool row CSV (Loop 197)", () => {
  it("GET /agent/tools/:toolName/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/agent/tools/tool_get_pricing_context/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("tool_get_pricing_context");
  });
});

describe("export store kinds (Loop 194-197)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports pricing_snapshot_row_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "pricing_snapshot_row_csv",
        sku_id: "demo-sku-001",
        channel: "MERCADO_LIBRE",
      }),
    });
    expect(post.status).toBe(200);
  });
});
