import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import {
  resetListingSyncScheduleForTests,
} from "../../apps/bff/src/listing-sync-schedule.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("listing sync run-due (Loop 86)", () => {
  beforeEach(() => {
    resetListingSyncScheduleForTests();
    resetListingSyncJobsForTests();
  });

  it("POST run-due returns 409 when schedule disabled", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/listing-sync/run-due", {
      method: "POST",
      headers: JSON_HEADERS,
    });
    expect(res.status).toBe(409);
  });

  it("POST run-due runs default listings when enabled", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1650);
    listingAdapter.priceByRef.set("B0TEST123", 1720);
    await app.request("/api/v1/ops/listing-sync/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ enabled: true }),
    });
    const res = await app.request("/api/v1/ops/listing-sync/run-due", {
      method: "POST",
      headers: JSON_HEADERS,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      runs: Array<{ listing_id: string; job: { status: string } }>;
      schedule: { last_run_at: string | null };
    };
    expect(json.runs.length).toBe(2);
    expect(json.runs.every((r) => r.job.status === "ok")).toBe(true);
    expect(json.schedule.last_run_at).toBeTruthy();
  });
});

describe("competitor_curve_csv export (Loop 87)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports kind competitor_curve_csv", async () => {
    const { app } = createTestApp();
    const created = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "exp-curve", label: "Export" }),
      }
    );
    expect(created.status).toBe(201);
    const offer = (await created.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1500, shipping_addon: 0 }),
    });
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "competitor_curve_csv",
        listing_id: "listing-ml-001",
        range: "7d",
      }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    const text = await dl.text();
    expect(text).toContain("avg_effective_mxn");
  });
});

describe("adjustment_batch_csv export (Loop 88)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports kind adjustment_batch_csv", async () => {
    const { app } = createTestApp();
    const batchRes = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason_code: "csv-export",
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1588 }],
      }),
    });
    expect(batchRes.status).toBe(201);
    const batch = (await batchRes.json()) as { id: string };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "adjustment_batch_csv",
        batch_id: batch.id,
      }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    const text = await dl.text();
    expect(text).toContain("listing-ml-001");
    expect(text).toContain("1588");
  });
});
