import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("competitor offers CSV (Loop 126)", () => {
  it("GET /listings/:id/competitors/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/competitors/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("offer_id");
  });
});

describe("shared fee templates CSV (Loop 127)", () => {
  it("GET /shared-fee-templates/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/shared-fee-templates/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("fee-tpl-ml-electronics");
  });
});

describe("ops metrics CSV (Loop 128)", () => {
  it("GET /ops/metrics/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/metrics/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("tenant-demo");
  });
});

describe("export store kinds (Loop 126-128)", () => {
  it("POST /exports ops_metrics_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "ops_metrics_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
