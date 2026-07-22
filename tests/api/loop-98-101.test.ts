import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetCostSheetsForTests } from "../../apps/bff/src/cost-sheet-store.js";
import { resetRepricingBatchJobQueueForTests } from "../../apps/bff/src/repricing-batch-job-queue.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("cross-channel dashboard CSV (Loop 98)", () => {
  it("GET /cross-channel/dashboard/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/cross-channel/dashboard/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("sku_id");
    expect(text).toContain("demo-sku-001");
  });

  it("POST /exports kind cross_channel_dashboard_csv", async () => {
    resetStoredExportsForTests();
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "cross_channel_dashboard_csv" }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    expect(dl.status).toBe(200);
  });
});

describe("cost sheets CSV (Loop 99)", () => {
  beforeEach(() => {
    resetCostSheetsForTests();
  });

  it("GET /skus/:id/cost-sheets/export", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/skus/demo-sku-001/cost-sheets", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        batch_no: "EXP-99",
        cogs_amount: 900,
        cogs_currency: "MXN",
      }),
    });
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/cost-sheets/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("EXP-99");
  });
});

describe("repricing batch jobs summary and CSV (Loop 100)", () => {
  beforeEach(() => {
    resetRepricingBatchJobQueueForTests();
  });

  it("GET /repricing-batch/jobs/summary and export", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/repricing-batch/jobs/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        scope: "sku",
        sku_id: "demo-sku-001",
        shard_total: 4,
      }),
    });
    expect(enq.status).toBe(201);
    const summary = await app.request(
      "/api/v1/repricing-batch/jobs/summary",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(summary.status).toBe(200);
    const body = (await summary.json()) as {
      summary: { queued: number };
    };
    expect(body.summary.queued).toBeGreaterThanOrEqual(1);
    const exp = await app.request("/api/v1/repricing-batch/jobs/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(exp.status).toBe(200);
    const csv = await exp.text();
    expect(csv).toContain("job_id");
  });
});
