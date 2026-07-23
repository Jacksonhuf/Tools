import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("agent readiness check row CSV (Loop 198)", () => {
  it("GET /agent/readiness/checks/export?check_id=", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/agent/readiness/checks/export?check_id=TC-NFR-SEC-004",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("TC-NFR-SEC-004");
  });
});

describe("agent milestone row CSV (Loop 199)", () => {
  it("GET /agent/milestones/:milestoneId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/milestones/P3/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("P3");
  });
});

describe("product readiness check row CSV (Loop 200)", () => {
  it("GET /product/readiness/checks/export?check_id=", async () => {
    const { app } = createTestApp();
    const checkId = encodeURIComponent("TC-INT-CH-003/004");
    const res = await app.request(
      `/api/v1/product/readiness/checks/export?check_id=${checkId}`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("TC-INT-CH-003/004");
  });
});

describe("feature flag row CSV (Loop 201)", () => {
  it("GET /feature-flags/:flagKey/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/feature-flags/agent_copilot/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("agent_copilot");
  });
});

describe("export store kinds (Loop 198-201)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports feature_flag_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "feature_flag_csv",
        flag_key: "digest_dispatch",
      }),
    });
    expect(post.status).toBe(200);
  });
});
