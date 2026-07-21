import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetChannelSandboxForTests } from "../../apps/bff/src/channel-sandbox-ledger.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("channel sandbox", () => {
  beforeEach(() => {
    resetChannelSandboxForTests();
    delete process.env.CHANNEL_SANDBOX_MODE;
  });

  it("GET /channels/sandbox/status defaults enabled", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/channels/sandbox/status", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { enabled: boolean; mode: string };
    expect(json.enabled).toBe(true);
    expect(json.mode).toBe("sandbox");
  });

  it("records publish in sandbox events ledger", async () => {
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
    await app.request("/api/v1/listings/listing-ml-001/channel-publish", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    const events = await app.request("/api/v1/channels/sandbox/events", {
      headers: { ...AUTH, ...TENANT },
    });
    const body = (await events.json()) as {
      items: Array<{ event_type: string; listing_id: string }>;
    };
    expect(body.items.some((e) => e.event_type === "channel_publish")).toBe(true);
    expect(body.items[0].listing_id).toBe("listing-ml-001");
  });

  it("TC-API-SBX-002 CHANNEL_SANDBOX_MODE=false disables ledger and production status", async () => {
    process.env.CHANNEL_SANDBOX_MODE = "false";
    const { app } = createTestApp();
    const status = await app.request("/api/v1/channels/sandbox/status", {
      headers: { ...AUTH, ...TENANT },
    });
    const statusJson = (await status.json()) as {
      enabled: boolean;
      mode: string;
    };
    expect(statusJson.enabled).toBe(false);
    expect(statusJson.mode).toBe("production");

    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1630 }),
    });
    await app.request("/api/v1/listings/listing-ml-001/channel-publish", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    const events = await app.request("/api/v1/channels/sandbox/events", {
      headers: { ...AUTH, ...TENANT },
    });
    const body = (await events.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(0);
  });
});
