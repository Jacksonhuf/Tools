import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

async function connectBothShops(app: ReturnType<typeof createTestApp>["app"]) {
  await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  });
  await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  });
}

describe("TC-INT-CH-006 partial batch publish", () => {
  it("returns partial_success when ML publishes and Amazon fails", async () => {
    const { app, publishAdapter } = createTestApp();
    await connectBothShops(app);
    publishAdapter.blockedChannels.add("AMAZON_MX");
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1610 }),
    });
    await app.request("/api/v1/listings/listing-amz-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1605 }),
    });
    const batch = await app.request("/api/v1/channel-publish/batch", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        listing_ids: ["listing-ml-001", "listing-amz-001"],
      }),
    });
    expect(batch.status).toBe(200);
    const body = (await batch.json()) as {
      publish_status: string;
      items: Array<{
        listing_id: string;
        publish_status: string;
        version_channel_publish_status?: string;
        error_code?: string;
      }>;
    };
    expect(body.publish_status).toBe("partial_success");
    const ml = body.items.find((i) => i.listing_id === "listing-ml-001");
    const amz = body.items.find((i) => i.listing_id === "listing-amz-001");
    expect(ml?.publish_status).toBe("published");
    expect(ml?.version_channel_publish_status).toBe("published");
    expect(amz?.publish_status).toBe("failed");
    expect(amz?.error_code).toBe("CHANNEL_REJECTED");
    expect(amz?.version_channel_publish_status).toBe("failed");
    publishAdapter.blockedChannels.clear();
  });
});
