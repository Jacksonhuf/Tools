import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("ops metrics", () => {
  it("GET /ops/metrics returns tenant snapshot (TC-API-OPS-001)", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/metrics", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      tenant_id: string;
      catalog_driver: string;
      channel_sandbox: { enabled: boolean; event_count: number };
      channel_adapters: { driver: string };
    };
    expect(json.tenant_id).toBe("tenant-demo");
    expect(json.catalog_driver).toBe("memory");
    expect(json.channel_adapters.driver).toBe("mock");
    expect(json.channel_sandbox.enabled).toBe(true);
  });
});
