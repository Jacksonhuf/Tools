import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("P3 readiness CSV (Loop 170)", () => {
  it("GET /product/readiness/p3/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/readiness/p3/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("TC-INT-CH-003/004");
  });
});

describe("P4 readiness CSV (Loop 171)", () => {
  it("GET /product/readiness/p4/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/readiness/p4/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("TC-NFR-SEC-004");
  });
});

describe("shared fee template CSV (Loop 172)", () => {
  it("GET /shared-fee-templates/:templateId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/shared-fee-templates/fee-tpl-ml-electronics/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("fee-tpl-ml-electronics");
  });
});

describe("tenant shared fee templates CSV (Loop 173)", () => {
  it("GET /tenants/:tenantId/shared-fee-templates/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/tenants/tenant-demo/shared-fee-templates/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("fee-tpl-ml-electronics");
  });
});

describe("export store kinds (Loop 170-173)", () => {
  it("POST /exports p3_readiness_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "p3_readiness_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports shared_fee_template_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "shared_fee_template_csv",
        fee_template_id: "fee-tpl-ml-electronics",
      }),
    });
    expect(post.status).toBe(200);
  });
});
