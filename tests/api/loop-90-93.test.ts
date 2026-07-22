import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";
import {
  resetListingSyncScheduleForTests,
} from "../../apps/bff/src/listing-sync-schedule.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("ops listing sync jobs feed (Loop 90)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
    resetListingSyncScheduleForTests();
  });

  it("GET /ops/listing-sync/jobs returns tenant-wide jobs", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1600);
    await app.request("/api/v1/listings/listing-ml-001/sync", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    const res = await app.request("/api/v1/ops/listing-sync/jobs", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ listing_id: string }> };
    expect(json.items.length).toBeGreaterThan(0);
    expect(json.items[0].listing_id).toBe("listing-ml-001");
  });
});

describe("competitor curve direct CSV (Loop 91)", () => {
  it("GET /listings/:id/competitors/curve/export", async () => {
    const { app } = createTestApp();
    const created = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "curve-dl", label: "DL" }),
      }
    );
    const offer = (await created.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1420, shipping_addon: 0 }),
    });
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/competitors/curve/export?range=7d",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("avg_effective_mxn");
  });
});

describe("adjustment batch direct CSV + cron validation (Loop 92)", () => {
  beforeEach(() => {
    resetListingSyncScheduleForTests();
  });

  it("GET /adjustment-batches/:id/export", async () => {
    const { app } = createTestApp();
    const batchRes = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason_code: "direct-export",
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1588 }],
      }),
    });
    expect(batchRes.status).toBe(201);
    const batch = (await batchRes.json()) as { id: string };
    const res = await app.request(
      `/api/v1/adjustment-batches/${batch.id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("1588");
  });

  it("PUT schedule rejects invalid cron", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/listing-sync/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ cron_expression: "not-a-cron" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST run-due?force=true when schedule disabled", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    listingAdapter.priceByRef.set("MLM123456", 1610);
    const res = await app.request(
      "/api/v1/ops/listing-sync/run-due?force=true",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { runs: unknown[] };
    expect(json.runs.length).toBe(2);
  });
});
