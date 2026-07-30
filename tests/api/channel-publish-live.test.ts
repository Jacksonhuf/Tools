import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { HttpStubChannelPublishAdapter } from "@mx-pricing/channel-adapters";
import { createApp } from "../../apps/bff/src/app.js";
import {
  getChannelAdapterStatus,
  resolveChannelAdapterDriver,
} from "../../apps/bff/src/channel-adapter-factory.js";
import { resolveListingExternalRef } from "../../apps/bff/src/listing-channel-refs.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("P3-E2 live channel publish", () => {
  const prevDeploy = process.env.DEPLOY_ENV;
  const prevDriver = process.env.CHANNEL_ADAPTER_DRIVER;
  const prevAck = process.env.CHANNEL_LIVE_ACKNOWLEDGED;
  const prevPublishUrl = process.env.CHANNEL_HTTP_PUBLISH_URL;

  beforeEach(() => {
    delete process.env.CHANNEL_ADAPTER_DRIVER;
    delete process.env.CHANNEL_HTTP_PUBLISH_URL;
    delete process.env.CHANNEL_LIVE_ACKNOWLEDGED;
    delete process.env.DEPLOY_ENV;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevDeploy === undefined) delete process.env.DEPLOY_ENV;
    else process.env.DEPLOY_ENV = prevDeploy;
    if (prevDriver === undefined) delete process.env.CHANNEL_ADAPTER_DRIVER;
    else process.env.CHANNEL_ADAPTER_DRIVER = prevDriver;
    if (prevAck === undefined) delete process.env.CHANNEL_LIVE_ACKNOWLEDGED;
    else process.env.CHANNEL_LIVE_ACKNOWLEDGED = prevAck;
    if (prevPublishUrl === undefined) delete process.env.CHANNEL_HTTP_PUBLISH_URL;
    else process.env.CHANNEL_HTTP_PUBLISH_URL = prevPublishUrl;
  });

  it("defaults to auto driver in staging when live is acknowledged", () => {
    process.env.DEPLOY_ENV = "staging";
    process.env.CHANNEL_LIVE_ACKNOWLEDGED = "1";
    expect(resolveChannelAdapterDriver()).toBe("auto");
    expect(getChannelAdapterStatus().deploy_env_auto_driver).toBe(true);
  });

  it("resolves demo listing ids to marketplace external refs", () => {
    expect(resolveListingExternalRef("listing-ml-001")).toBe("MLM123456");
    expect(resolveListingExternalRef("listing-amz-001")).toBe("B0TEST123");
  });

  it("publish uses marketplace external_ref via HTTP stub adapter", async () => {
    process.env.CHANNEL_HTTP_PUBLISH_URL = "https://channel-stub.example/publish";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          publish_status: "published",
          channel_price_mxn: 1625,
          channel: "MERCADO_LIBRE",
        })
      )
    );
    const publisher = new HttpStubChannelPublishAdapter();
    const app = createApp({ publishAdapter: publisher });

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
    expect(publisher.lastHttpRequest?.body).toMatchObject({
      external_ref: "MLM123456",
      price_mxn: 1625,
    });
  });
});
