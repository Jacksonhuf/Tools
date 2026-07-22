import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetRepricingBatchJobQueueForTests } from "../../apps/bff/src/repricing-batch-job-queue.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-API-REPR-BATCH-004 repricing batch job queue", () => {
  beforeEach(() => {
    resetRepricingBatchJobQueueForTests();
    const t = createTestApp();
    t.repricing.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("enqueue tenant job then process completes", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/repricing-batch/jobs/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ scope: "tenant", shard_total: 2 }),
    });
    expect(enq.status).toBe(201);
    const { job } = (await enq.json()) as {
      job: { job_id: string; status: string; scope: string };
    };
    expect(job.status).toBe("queued");
    expect(job.scope).toBe("tenant");

    const proc = await app.request("/api/v1/repricing-batch/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    expect(proc.status).toBe(200);
    const out = (await proc.json()) as {
      processed: Array<{ status: string; result: { totals: { processed: number } } }>;
    };
    expect(out.processed[0].status).toBe("completed");
    expect(out.processed[0].result.totals).toBeDefined();

    const get = await app.request(
      `/api/v1/repricing-batch/jobs/${job.job_id}`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(get.status).toBe(200);
    const stored = (await get.json()) as { status: string };
    expect(stored.status).toBe("completed");
  });

  it("sku scope requires sku_id", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/repricing-batch/jobs/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ scope: "sku", shard_total: 2 }),
    });
    expect(res.status).toBe(400);
  });

  it("ops metrics includes repricing_batch_queue", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/repricing-batch/jobs/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ scope: "tenant", shard_total: 2 }),
    });
    const metrics = await app.request("/api/v1/ops/metrics", {
      headers: { ...AUTH, ...TENANT },
    });
    const json = (await metrics.json()) as {
      repricing_batch_queue: { total: number; queued: number };
    };
    expect(json.repricing_batch_queue.total).toBe(1);
    expect(json.repricing_batch_queue.queued).toBe(1);
  });
});
