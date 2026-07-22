import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("agent readiness CSV (Loop 138)", () => {
  it("GET /agent/readiness/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/readiness/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("TC-NFR-SEC-004");
  });
});

describe("competitor anchor CSV (Loop 139)", () => {
  it("GET /listings/:id/competitors/anchor/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/competitors/anchor/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("listing-ml-001");
    expect(text).toContain("median_mxn");
  });
});

describe("product readiness CSV (Loop 140)", () => {
  it("GET /product/readiness/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/readiness/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("milestone");
  });
});

describe("export store kinds (Loop 138-140)", () => {
  it("POST /exports agent_readiness_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "agent_readiness_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
