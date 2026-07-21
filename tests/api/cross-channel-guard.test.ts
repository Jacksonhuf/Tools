import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("cross-channel guard API", () => {
  it("GET /cross-channel-guard after dual publish (TC-API-XCH-001)", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1800 }),
    });
    await app.request("/api/v1/listings/listing-amz-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 2200 }),
    });
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/cross-channel-guard",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      warning: { code: string; spread_pct: number } | null;
    };
    expect(json.warning?.code).toBe("CROSS_CHANNEL_SPREAD_EXCEEDED");
    expect(json.warning!.spread_pct).toBeGreaterThan(15);
  });
});
