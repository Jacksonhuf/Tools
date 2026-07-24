import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("listing sync schedule CSV (Loop 150)", () => {
  it("GET /ops/listing-sync/schedule/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/ops/listing-sync/schedule/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("cron_expression");
  });
});

describe("agent milestones CSV (Loop 151)", () => {
  it("GET /agent/milestones/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/milestones/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("P3");
  });
});

describe("adjustment approval policy CSV (Loop 152)", () => {
  it("GET /adjustment-batches/approval-policy/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/adjustment-batches/approval-policy/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("max_drop_pct_without_approval");
  });
});

describe("ops workers status summary CSV (Loop 153)", () => {
  it("GET /ops/workers/status/summary/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/ops/workers/status/summary/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("worker_count");
  });
});

describe("export store kinds (Loop 150-152)", () => {
  it("POST /exports listing_sync_schedule_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "listing_sync_schedule_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports agent_milestones_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "agent_milestones_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports adjustment_approval_policy_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "adjustment_approval_policy_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports ops_workers_status_summary_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "ops_workers_status_summary_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
