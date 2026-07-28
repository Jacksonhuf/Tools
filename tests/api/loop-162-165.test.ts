import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetCopilotSessionsForTests } from "../../apps/bff/src/copilot-session.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("pricing context CSV (Loop 162)", () => {
  it("GET /skus/:skuId/pricing-context/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/pricing-context/export?channel=MERCADO_LIBRE",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("anchor_median_mxn");
  });
});

describe("repricing batch job CSV (Loop 163)", () => {
  it("GET /repricing-batch/jobs/:jobId/export", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/repricing-batch/jobs/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ scope: "tenant", shard_total: 2 }),
    });
    expect(enq.status).toBe(201);
    const { job } = (await enq.json()) as { job: { job_id: string } };
    const res = await app.request(
      `/api/v1/repricing-batch/jobs/${job.job_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("job_id");
  });
});

describe("category rule template CSV (Loop 164)", () => {
  it("GET /category-rule-templates/:categoryId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/category-rule-templates/cat-electronics-mx/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("cat-electronics-mx");
  });
});

describe("copilot session CSV (Loop 165)", () => {
  it("GET /agent/copilot/sessions/:sessionId/export", async () => {
    resetCopilotSessionsForTests();
    const { app } = createTestApp();
    const created = await app.request("/api/v1/agent/copilot/sessions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        listing_id: "listing-ml-001",
        sku_id: "demo-sku-001",
      }),
    });
    const { session_id } = (await created.json()) as { session_id: string };
    const res = await app.request(
      `/api/v1/agent/copilot/sessions/${session_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("session_id");
  });
});

describe("export store kinds (Loop 162-165)", () => {
  it("POST /exports pricing_context_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "pricing_context_csv",
        sku_id: "demo-sku-001",
        channel: "MERCADO_LIBRE",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports repricing_batch_job_csv", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/repricing-batch/jobs/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ scope: "tenant", shard_total: 2 }),
    });
    const { job } = (await enq.json()) as { job: { job_id: string } };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "repricing_batch_job_csv",
        job_id: job.job_id,
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports category_rule_template_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "category_rule_template_csv",
        category_id: "cat-electronics-mx",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports copilot_session_csv", async () => {
    resetCopilotSessionsForTests();
    const { app } = createTestApp();
    const created = await app.request("/api/v1/agent/copilot/sessions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        listing_id: "listing-ml-001",
        sku_id: "demo-sku-001",
      }),
    });
    const { session_id } = (await created.json()) as { session_id: string };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "copilot_session_csv",
        session_id,
      }),
    });
    expect(post.status).toBe(200);
  });
});
