import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDigestDispatchForTests } from "../../apps/bff/src/agent-digest-dispatch.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";
import { resetWorkerHeartbeatsForTests } from "../../apps/bff/src/worker-heartbeat.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("tenant repricing queue CSV (Loop 114)", () => {
  it("GET /repricing-queue/export", async () => {
    const { app, catalog } = createTestApp();
    catalog.resetForTests?.();
    await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "suggested",
      publish_price_mxn: 1588,
    });
    const res = await app.request("/api/v1/repricing-queue/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("demo-sku-001");
    expect(text).toContain("suggested");
  });
});

describe("digest dispatches CSV (Loop 115)", () => {
  beforeEach(() => {
    resetDigestDispatchForTests();
  });

  it("GET /agent/digest/dispatches/export after dispatch", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/agent/digest/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ enabled: true, email_to: "ops@demo.mx" }),
    });
    await app.request("/api/v1/agent/digest/daily/dispatch", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ channels: ["email_stub"] }),
    });
    const res = await app.request(
      "/api/v1/agent/digest/dispatches/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("digest-job");
  });
});

describe("digest queued jobs summary and CSV (Loop 116)", () => {
  beforeEach(() => {
    resetDigestJobQueueForTests();
  });

  it("summary and export after enqueue", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ channels: ["email_stub"] }),
    });
    const summary = await app.request(
      "/api/v1/agent/digest/jobs/summary",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(summary.status).toBe(200);
    const body = (await summary.json()) as {
      queue: { queued: number };
      items: unknown[];
    };
    expect(body.queue.queued).toBeGreaterThanOrEqual(1);
    const exp = await app.request("/api/v1/agent/digest/jobs/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(exp.status).toBe(200);
    expect(await exp.text()).toContain("digest-q");
  });
});

describe("worker heartbeats CSV (Loop 117)", () => {
  beforeEach(() => {
    resetWorkerHeartbeatsForTests();
  });

  it("GET /ops/workers/status/export after heartbeat", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/ops/workers/heartbeat", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ worker_id: "repricing-batch-1" }),
    });
    const res = await app.request("/api/v1/ops/workers/status/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("repricing-batch-1");
  });
});

describe("export store kinds (Loop 114-116)", () => {
  it("POST /exports repricing_queue_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "repricing_queue_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
