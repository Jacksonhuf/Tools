import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("reconciliation alerts direct CSV (Loop 130)", () => {
  it("GET /reconciliation-alerts/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/reconciliation-alerts/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("listing_id");
  });
});

describe("listing sync ops status CSV (Loop 131)", () => {
  it("GET /ops/listing-sync/status/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/ops/listing-sync/status/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("schedule_enabled");
  });
});

describe("listing sync jobs per listing CSV (Loop 132)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
  });

  it("GET /listings/:id/sync/jobs/export", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1640);
    await app.request("/api/v1/listings/listing-ml-001/sync", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/sync/jobs/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("listing-ml-001");
  });
});

describe("agent tools CSV (Loop 133)", () => {
  it("GET /agent/tools/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/tools/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("tool_get_pricing_context");
  });
});

describe("export store kinds (Loop 130-133)", () => {
  it("POST /exports agent_tools_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "agent_tools_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports listing_sync_ops_status_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "listing_sync_ops_status_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports listing_sync_jobs_listing_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "listing_sync_jobs_listing_csv",
        listing_id: "listing-ml-001",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports reconciliation_alerts_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "reconciliation_alerts_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
