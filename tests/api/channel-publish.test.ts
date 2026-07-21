import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-INT-CH-003 ML publishPrice mock", () => {
  it("publishes active version price when shop connected", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1625 }),
    });
    const pub = await app.request(
      "/api/v1/listings/listing-ml-001/channel-publish",
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({}) }
    );
    expect(pub.status).toBe(200);
    const body = (await pub.json()) as {
      publish_status: string;
      channel_price_mxn: number;
    };
    expect(body.publish_status).toBe("published");
    expect(body.channel_price_mxn).toBe(1625);
  });
});
