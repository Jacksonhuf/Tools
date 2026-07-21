import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  getChannelAdapterStatus,
  resolveChannelAdapterDriver,
} from "../../apps/bff/src/channel-adapter-factory.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("channel adapter factory", () => {
  beforeEach(() => {
    delete process.env.CHANNEL_ADAPTER_DRIVER;
    delete process.env.CHANNEL_HTTP_PUBLISH_URL;
    delete process.env.CHANNEL_HTTP_LISTING_PULL_URL;
  });

  it("GET /channels/adapters/status defaults to mock driver", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/channels/adapters/status", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { driver: string; ready: boolean };
    expect(json.driver).toBe("mock");
    expect(json.ready).toBe(true);
  });

  it("resolveChannelAdapterDriver honors CHANNEL_ADAPTER_DRIVER=http", () => {
    process.env.CHANNEL_ADAPTER_DRIVER = "http";
    expect(resolveChannelAdapterDriver()).toBe("http_stub");
    const status = getChannelAdapterStatus();
    expect(status.driver).toBe("http_stub");
    expect(status.ready).toBe(true);
  });
});
