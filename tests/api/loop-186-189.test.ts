import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDigestDispatchForTests } from "../../apps/bff/src/agent-digest-dispatch.js";
import { resetChannelSandboxForTests } from "../../apps/bff/src/channel-sandbox-ledger.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("digest dispatch row CSV (Loop 186)", () => {
  beforeEach(() => {
    resetDigestDispatchForTests();
  });

  it("GET /agent/digest/dispatches/:jobId/export", async () => {
    const { app } = createTestApp();
    const dispatch = await app.request("/api/v1/agent/digest/daily/dispatch", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({ channels: ["email_stub"] }),
    });
    const { job } = (await dispatch.json()) as { job: { job_id: string } };
    const res = await app.request(
      `/api/v1/agent/digest/dispatches/${job.job_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(job.job_id);
  });
});

describe("channel sandbox event row CSV (Loop 187)", () => {
  beforeEach(() => {
    resetChannelSandboxForTests();
  });

  it("GET /channels/sandbox/events/:eventId/export", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1625 }),
    });
    await app.request("/api/v1/listings/listing-ml-001/channel-publish", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    const list = await app.request("/api/v1/channels/sandbox/events?limit=1", {
      headers: { ...AUTH, ...TENANT },
    });
    const { items } = (await list.json()) as { items: Array<{ id: string }> };
    expect(items.length).toBeGreaterThan(0);
    const res = await app.request(
      `/api/v1/channels/sandbox/events/${items[0].id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(items[0].id);
  });
});

describe("digest dead-letter job row CSV (Loop 188)", () => {
  beforeEach(() => {
    resetDigestJobQueueForTests();
    process.env.DIGEST_MAX_ATTEMPTS = "2";
  });

  it("GET /agent/digest/jobs/dead-letter/:jobId/export", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ simulate_poison: true, channels: ["email_stub"] }),
    });
    await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    const dlq = await app.request("/api/v1/agent/digest/jobs/dead-letter?limit=1", {
      headers: { ...AUTH, ...TENANT },
    });
    const { items } = (await dlq.json()) as { items: Array<{ job_id: string }> };
    expect(items.length).toBeGreaterThan(0);
    const res = await app.request(
      `/api/v1/agent/digest/jobs/dead-letter/${items[0].job_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(items[0].job_id);
  });

  it("dead-letter/summary/export still works (route order)", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/agent/digest/jobs/dead-letter/summary/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
  });
});

describe("agent tool audit row CSV (Loop 189)", () => {
  it("GET /agent/tool-audit/:auditId/export", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/agent/tools/invoke", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        tool: "tool_list_price_versions",
        arguments: { sku_id: "demo-sku-001" },
      }),
    });
    const list = await app.request("/api/v1/agent/tool-audit?limit=1", {
      headers: { ...AUTH, ...TENANT },
    });
    const { items } = (await list.json()) as {
      items: Array<{ id: string; tool_name: string }>;
    };
    expect(items.length).toBeGreaterThan(0);
    const res = await app.request(
      `/api/v1/agent/tool-audit/${items[0].id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(items[0].tool_name);
  });
});

describe("export store kinds (Loop 186-189)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
    resetDigestDispatchForTests();
    resetChannelSandboxForTests();
    resetDigestJobQueueForTests();
  });

  it("POST /exports digest_dispatch_csv", async () => {
    const { app } = createTestApp();
    const dispatch = await app.request("/api/v1/agent/digest/daily/dispatch", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({}),
    });
    const { job } = (await dispatch.json()) as { job: { job_id: string } };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "digest_dispatch_csv",
        dispatch_job_id: job.job_id,
      }),
    });
    expect(post.status).toBe(200);
  });
});
