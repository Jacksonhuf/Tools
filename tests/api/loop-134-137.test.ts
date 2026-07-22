import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("repricing batch jobs summary CSV (Loop 134)", () => {
  it("GET /repricing-batch/jobs/summary/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/repricing-batch/jobs/summary/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("driver");
  });
});

describe("listing ingest status CSV (Loop 135)", () => {
  it("GET /listings/:id/ingest/status/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/status/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("listing-ml-001");
    expect(text).toContain("tier");
  });
});

describe("feature flags CSV (Loop 136)", () => {
  it("GET /feature-flags/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/feature-flags/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("agent_copilot");
  });
});

describe("export store kinds (Loop 134-136)", () => {
  it("POST /exports feature_flags_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "feature_flags_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
