import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("cost sheet row CSV (Loop 178)", () => {
  it("GET /skus/:skuId/cost-sheets/:sheetId/export", async () => {
    const { app } = createTestApp();
    const created = await app.request("/api/v1/skus/demo-sku-001/cost-sheets", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        batch_no: "B-LOOP178",
        cogs_amount: 900,
      }),
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const res = await app.request(
      `/api/v1/skus/demo-sku-001/cost-sheets/${id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("B-LOOP178");
  });
});

describe("competitor offer CSV (Loop 179)", () => {
  it("GET /competitor-offers/:offerId/export", async () => {
    const { app } = createTestApp();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-OFFER-178" }),
      }
    );
    expect(create.status).toBe(201);
    const { id } = (await create.json()) as { id: string };
    const res = await app.request(`/api/v1/competitor-offers/${id}/export`, {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(id);
  });
});

describe("reconciliation alert CSV (Loop 180)", () => {
  it("GET /reconciliation-alerts/:alertId/export", async () => {
    const { app, catalog, listingAdapter, reconciliationAlerts } =
      createTestApp();
    reconciliationAlerts.resetForTests?.();
    catalog.resetForTests?.();
    await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 100,
    });
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 108);
    const recon = await app.request(
      "/api/v1/listings/listing-ml-001/reconcile",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM123456" }),
      }
    );
    const { alert_id } = (await recon.json()) as { alert_id: string };
    const res = await app.request(
      `/api/v1/reconciliation-alerts/${alert_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(alert_id);
  });
});

describe("export store kinds (Loop 178-180)", () => {
  it("POST /exports cost_sheet_csv", async () => {
    const { app } = createTestApp();
    const created = await app.request("/api/v1/skus/demo-sku-001/cost-sheets", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        batch_no: "B-EXPORT-178",
        cogs_amount: 880,
      }),
    });
    const { id } = (await created.json()) as { id: string };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "cost_sheet_csv",
        sku_id: "demo-sku-001",
        cost_sheet_id: id,
      }),
    });
    expect(post.status).toBe(200);
  });
});
