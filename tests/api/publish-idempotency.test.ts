import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetPublishIdempotencyForTests } from "../../apps/bff/src/publish-idempotency-store.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-INT-CH-007 publish idempotency_key", () => {
  beforeEach(() => {
    resetPublishIdempotencyForTests();
  });

  it("replays stored outcome without second adapter call", async () => {
    const { app, publishAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    publishAdapter.publishInvocationCount = 0;
    const first = await app.request(
      "/api/v1/listings/listing-ml-001/channel-publish",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          explicit_price_mxn: 1500,
          idempotency_key: "pub-ml-1500",
        }),
      }
    );
    expect(first.status).toBe(200);
    expect(publishAdapter.publishInvocationCount).toBe(1);

    const second = await app.request(
      "/api/v1/listings/listing-ml-001/channel-publish",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          explicit_price_mxn: 9999,
          idempotency_key: "pub-ml-1500",
        }),
      }
    );
    expect(second.status).toBe(200);
    const body = (await second.json()) as {
      channel_price_mxn: number;
      idempotent_replay: boolean;
    };
    expect(body.channel_price_mxn).toBe(1500);
    expect(body.idempotent_replay).toBe(true);
    expect(publishAdapter.publishInvocationCount).toBe(1);
  });
});
