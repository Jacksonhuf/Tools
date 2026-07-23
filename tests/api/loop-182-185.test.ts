import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";
import { resetWorkerHeartbeatsForTests } from "../../apps/bff/src/worker-heartbeat.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("listing sync job CSV (Loop 182)", () => {
  beforeEach(() => {
    resetListingSyncJobsForTests();
  });

  it("GET /ops/listing-sync/jobs/:jobId/export", async () => {
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
    const list = await app.request("/api/v1/ops/listing-sync/jobs?limit=1", {
      headers: { ...AUTH, ...TENANT },
    });
    const { items } = (await list.json()) as { items: Array<{ id: string }> };
    expect(items.length).toBeGreaterThan(0);
    const res = await app.request(
      `/api/v1/ops/listing-sync/jobs/${items[0].id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("listing-ml-001");
  });
});

describe("digest queued job CSV (Loop 183)", () => {
  beforeEach(() => {
    resetDigestJobQueueForTests();
  });

  it("GET /agent/digest/jobs/:jobId/export", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({ channels: ["email_stub"] }),
    });
    const { job } = (await enq.json()) as { job: { job_id: string } };
    const res = await app.request(
      `/api/v1/agent/digest/jobs/${job.job_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(job.job_id);
  });
});

describe("worker heartbeat CSV (Loop 184)", () => {
  beforeEach(() => {
    resetWorkerHeartbeatsForTests();
  });

  it("GET /ops/workers/status/:workerId/export", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/ops/workers/heartbeat", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ worker_id: "async-worker-182" }),
    });
    const res = await app.request(
      "/api/v1/ops/workers/status/async-worker-182/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("async-worker-182");
  });
});

describe("export store kinds (Loop 182-184)", () => {
  it("POST /exports digest_queued_job_csv", async () => {
    resetDigestJobQueueForTests();
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({}),
    });
    const { job } = (await enq.json()) as { job: { job_id: string } };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "digest_queued_job_csv",
        digest_job_id: job.job_id,
      }),
    });
    expect(post.status).toBe(200);
  });
});
