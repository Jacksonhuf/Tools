import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetWorkerHeartbeatsForTests } from "../../apps/bff/src/worker-heartbeat.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-API-XCH-002 cross-channel dashboard (P3-E3-04)", () => {
  it("GET /cross-channel/dashboard lists SKU spreads", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1800 }),
    });
    await app.request("/api/v1/listings/listing-amz-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 2200 }),
    });
    const res = await app.request("/api/v1/cross-channel/dashboard", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      sku_count: number;
      alert_count: number;
      items: Array<{ sku_id: string; warning: { code: string } | null }>;
    };
    expect(json.sku_count).toBeGreaterThan(0);
    expect(json.alert_count).toBeGreaterThanOrEqual(1);
    expect(
      json.items.some((i) => i.warning?.code === "CROSS_CHANNEL_SPREAD_EXCEEDED")
    ).toBe(true);
  });
});

describe("TC-API-IMP-001 landed cost CSV import (P0-E5-03)", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.catalog.resetForTests?.();
  });

  it("POST /imports/landed-cost updates SKU", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/imports/landed-cost", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        csv: "sku_id,landed_cost_mxn\ndemo-sku-001,1150\n",
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      updated: Array<{ sku_id: string; landed_cost_mxn: number }>;
    };
    expect(json.updated[0]?.landed_cost_mxn).toBe(1150);
  });
});

describe("TC-API-OPS-002 version backup (X-05)", () => {
  it("GET /ops/version-backup returns versions", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/version-backup", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      version_count: number;
      versions: unknown[];
    };
    expect(json.version_count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(json.versions)).toBe(true);
  });
});

describe("TC-API-WKR-001 async worker heartbeat (P0-E1-05)", () => {
  beforeEach(() => {
    resetWorkerHeartbeatsForTests();
  });

  it("POST heartbeat then GET status", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/ops/workers/heartbeat", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ worker_id: "test-worker-1" }),
    });
    expect(post.status).toBe(200);
    const status = await app.request("/api/v1/ops/workers/status", {
      headers: { ...AUTH, ...TENANT },
    });
    const json = (await status.json()) as {
      workers: Array<{ worker_id: string; stale: boolean }>;
    };
    expect(json.workers.some((w) => w.worker_id === "test-worker-1")).toBe(
      true
    );
  });
});
