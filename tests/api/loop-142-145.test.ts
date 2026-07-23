import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("digest queued jobs summary CSV (Loop 142)", () => {
  it("GET /agent/digest/jobs/summary/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/agent/digest/jobs/summary/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("queue_total");
  });
});

describe("channel adapters status CSV (Loop 143)", () => {
  it("GET /channels/adapters/status/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/channels/adapters/status/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("driver");
  });
});

describe("rule compiler status CSV (Loop 144)", () => {
  it("GET /rule-compiler/status/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/rule-compiler/status/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("llm_ready");
  });
});

describe("export store kinds (Loop 142-144)", () => {
  it("POST /exports rule_compiler_status_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "rule_compiler_status_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports digest_queued_jobs_summary_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "digest_queued_jobs_summary_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports channel_adapters_status_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "channel_adapters_status_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
