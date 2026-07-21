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
      channel: string;
    };
    expect(body.publish_status).toBe("published");
    expect(body.channel_price_mxn).toBe(1625);
    expect(body.channel).toBe("MERCADO_LIBRE");
  });
});

describe("TC-INT-CH-004 Amazon publishPrice mock", () => {
  it("publishes whole-peso price when shop connected", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    await app.request("/api/v1/listings/listing-amz-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1630 }),
    });
    const pub = await app.request(
      "/api/v1/listings/listing-amz-001/channel-publish",
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({}) }
    );
    expect(pub.status).toBe(200);
    const body = (await pub.json()) as {
      publish_status: string;
      channel_price_mxn: number;
      channel: string;
    };
    expect(body.publish_status).toBe("published");
    expect(body.channel_price_mxn).toBe(1630);
    expect(body.channel).toBe("AMAZON_MX");
  });

  it("shop-scoped publish resolves listing", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    await app.request("/api/v1/listings/listing-amz-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1640 }),
    });
    const pub = await app.request(
      "/api/v1/shops/shop-amz-demo/channel-publish",
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({}) }
    );
    expect(pub.status).toBe(200);
    const body = (await pub.json()) as { channel_price_mxn: number };
    expect(body.channel_price_mxn).toBe(1640);
  });
});

describe("TC-INT-CH-005 INVALID_PRICE_STEP retry", () => {
  it("retries Amazon publish with normalized whole peso", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    const pub = await app.request(
      "/api/v1/listings/listing-amz-001/channel-publish",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          explicit_price_mxn: 1625.75,
          retry_on_step: true,
        }),
      }
    );
    expect(pub.status).toBe(200);
    const body = (await pub.json()) as {
      publish_status: string;
      channel_price_mxn: number;
      retried: boolean;
    };
    expect(body.publish_status).toBe("published");
    expect(body.channel_price_mxn).toBe(1626);
    expect(body.retried).toBe(true);
  });

  it("does not freeze rule on step error when retry disabled", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    const pub = await app.request(
      "/api/v1/listings/listing-amz-001/channel-publish",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          explicit_price_mxn: 1625.5,
          retry_on_step: false,
        }),
      }
    );
    expect(pub.status).toBe(422);
    const fail = (await pub.json()) as { error_code: string; rule_frozen?: boolean };
    expect(fail.error_code).toBe("INVALID_PRICE_STEP");
    expect(fail.rule_frozen).toBeFalsy();
    const rule = await app.request(
      "/api/v1/listings/listing-amz-001/dynamic-repricing-rule",
      { headers: { ...AUTH, ...TENANT } }
    );
    const ruleBody = (await rule.json()) as { rule: { frozen: boolean } };
    expect(ruleBody.rule.frozen).toBe(false);
  });
});
