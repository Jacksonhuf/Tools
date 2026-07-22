import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";
import { resetListingSyncScheduleForTests } from "../../apps/bff/src/listing-sync-schedule.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("listing sync ops status (Loop 94)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
    resetListingSyncScheduleForTests();
  });

  it("GET /ops/listing-sync/status summarizes schedule and jobs", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/ops/listing-sync/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ enabled: true }),
    });
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1620);
    await app.request("/api/v1/listings/listing-ml-001/sync", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    const res = await app.request("/api/v1/ops/listing-sync/status", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      schedule: { enabled: boolean };
      job_summary: { ok: number; sampled: number };
    };
    expect(json.schedule.enabled).toBe(true);
    expect(json.job_summary.ok).toBeGreaterThan(0);
  });
});

describe("listing sync jobs CSV (Loop 95)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
    resetStoredExportsForTests();
  });

  it("GET /ops/listing-sync/jobs/export", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1630);
    await app.request("/api/v1/listings/listing-ml-001/sync", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    const res = await app.request("/api/v1/ops/listing-sync/jobs/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("listing_id");
    expect(text).toContain("listing-ml-001");
  });

  it("POST /exports kind listing_sync_jobs_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "listing_sync_jobs_csv", limit: 10 }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    expect(dl.status).toBe(200);
  });
});

describe("reconciliation alerts export store (Loop 96)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports kind reconciliation_alerts_csv", async () => {
    const { app, catalog, listingAdapter } = createTestApp();
    catalog.resetForTests?.();
    await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 100,
    });
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 105);
    await app.request("/api/v1/listings/listing-ml-001/reconcile", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456", tolerance_mxn: 1 }),
    });
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "reconciliation_alerts_csv" }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    const text = await dl.text();
    expect(text).toContain("listing_id");
  });
});

describe("listing sync jobs per listing API (Loop 97 support)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
  });

  it("GET /listings/:id/sync/jobs after sync", async () => {
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
      "/api/v1/listings/listing-ml-001/sync/jobs",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ status: string }> };
    expect(json.items[0]?.status).toBe("ok");
  });
});
