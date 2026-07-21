import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("reconciliation report", () => {
  it("GET CSV reconciliation-alerts (TC-API-RPT-003)", async () => {
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
    listingAdapter.priceByRef.set("MLM123456", 105);
    await app.request("/api/v1/listings/listing-ml-001/reconcile", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    const res = await app.request(
      "/api/v1/reports/reconciliation-alerts?format=csv",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("listing_id,channel");
    expect(text).toContain("listing-ml-001");
  });
});
