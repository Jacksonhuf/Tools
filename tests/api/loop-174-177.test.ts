import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("SKU catalog row CSV (Loop 174)", () => {
  it("GET /skus/:skuId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus/demo-sku-001/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("demo-sku-001");
  });
});

describe("listing CSV (Loop 175)", () => {
  it("GET /listings/:listingId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/listings/listing-ml-001/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("listing-ml-001");
  });
});

describe("tariff HS rate CSV (Loop 176)", () => {
  it("GET /tariff-hs-rates/:hsCode/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/tariff-hs-rates/HS-ELECTRONICS-MX/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("HS-ELECTRONICS-MX");
  });
});

describe("FX rate CSV (Loop 177)", () => {
  it("GET /fx-rates/:base/:quote/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/fx-rates/USD/MXN/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("USD");
  });
});

describe("export store kinds (Loop 174-177)", () => {
  it("POST /exports sku_catalog_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "sku_catalog_csv",
        sku_id: "demo-sku-001",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports fx_rate_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "fx_rate_csv",
        fx_base: "USD",
        fx_quote: "MXN",
      }),
    });
    expect(post.status).toBe(200);
  });
});
