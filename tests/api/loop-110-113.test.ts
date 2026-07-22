import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetChannelSandboxForTests } from "../../apps/bff/src/channel-sandbox-ledger.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("tenant pricing snapshots CSV (Loop 110)", () => {
  it("GET /reports/pricing-snapshots/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/reports/pricing-snapshots/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("demo-sku-001");
    expect(text).toContain("MERCADO_LIBRE");
  });
});

describe("channel sandbox events CSV (Loop 111)", () => {
  beforeEach(() => {
    resetChannelSandboxForTests();
  });

  it("GET /channels/sandbox/events/export after publish", async () => {
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
    const res = await app.request("/api/v1/channels/sandbox/events/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("event_type");
  });
});

describe("digest dead-letter summary and CSV (Loop 112)", () => {
  beforeEach(() => {
    resetDigestJobQueueForTests();
    process.env.DIGEST_MAX_ATTEMPTS = "2";
  });

  it("summary and export after poison job", async () => {
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
    const summary = await app.request(
      "/api/v1/agent/digest/jobs/dead-letter/summary",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(summary.status).toBe(200);
    const body = (await summary.json()) as {
      queue: { dead_letter: number };
      items: unknown[];
    };
    expect(body.queue.dead_letter).toBeGreaterThanOrEqual(1);
    const exp = await app.request(
      "/api/v1/agent/digest/jobs/dead-letter/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(exp.status).toBe(200);
    expect(await exp.text()).toContain("digest-q");
  });
});

describe("export store kinds (Loop 110-112)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
    resetChannelSandboxForTests();
  });

  it("POST /exports kind pricing_snapshots_tenant_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "pricing_snapshots_tenant_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports kind channel_sandbox_events_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "channel_sandbox_events_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
