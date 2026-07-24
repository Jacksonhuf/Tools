import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("auth status CSV (Loop 146)", () => {
  it("GET /auth/status/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/auth/status/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("driver");
  });
});

describe("channel sandbox status CSV (Loop 147)", () => {
  it("GET /channels/sandbox/status/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/channels/sandbox/status/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("sandbox");
  });
});

describe("digest dead-letter summary CSV (Loop 148)", () => {
  it("GET /agent/digest/jobs/dead-letter/summary/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/agent/digest/jobs/dead-letter/summary/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("queue_dead_letter");
  });
});

describe("export store kinds (Loop 146-148)", () => {
  it("POST /exports channel_sandbox_status_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "channel_sandbox_status_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports auth_status_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "auth_status_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports digest_dead_letter_summary_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "digest_dead_letter_summary_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
