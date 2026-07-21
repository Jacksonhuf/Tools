import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-INT-RECON-001 channel price mismatch alert", () => {
  it("creates reconciliation alert when channel price differs from active", async () => {
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

    const recon = await app.request(
      "/api/v1/listings/listing-ml-001/reconcile",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM123456" }),
      }
    );
    expect(recon.status).toBe(200);
    const result = (await recon.json()) as {
      status: string;
      active_price_mxn: number;
      channel_price_mxn: number;
      delta_mxn: number;
      alert_id: string;
    };
    expect(result.status).toBe("mismatch");
    expect(result.active_price_mxn).toBe(100);
    expect(result.channel_price_mxn).toBe(105);
    expect(result.delta_mxn).toBe(5);

    const alerts = await app.request("/api/v1/reconciliation-alerts", {
      headers: { ...AUTH, ...TENANT },
    });
    const list = (await alerts.json()) as {
      items: Array<{ id: string; listing_id: string; delta_mxn: number }>;
    };
    expect(list.items).toHaveLength(1);
    expect(list.items[0].id).toBe(result.alert_id);
    expect(list.items[0].delta_mxn).toBe(5);
  });

  it("returns ok when prices match within tolerance", async () => {
    const { app, catalog, listingAdapter } = createTestApp();
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
    listingAdapter.priceByRef.set("MLM123456", 100);

    const recon = await app.request(
      "/api/v1/listings/listing-ml-001/reconcile",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM123456" }),
      }
    );
    expect(recon.status).toBe(200);
    const result = (await recon.json()) as { status: string };
    expect(result.status).toBe("ok");
  });
});
