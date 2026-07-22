import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("feature flags", () => {
  it("GET /feature-flags (TC-API-FF-001)", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/feature-flags", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      agent_copilot: boolean;
      buy_box_anchor: boolean;
      repricing_batch_worker: boolean;
    };
    expect(json.agent_copilot).toBe(true);
    expect(json.buy_box_anchor).toBe(true);
    expect(json.repricing_batch_worker).toBe(true);
  });
});
