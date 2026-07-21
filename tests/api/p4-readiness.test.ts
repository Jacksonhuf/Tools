import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { evaluateAgentReadiness } from "../../apps/bff/src/agent-readiness.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("P4 agent readiness", () => {
  it("evaluateAgentReadiness passes SEC-004 checks", () => {
    const r = evaluateAgentReadiness();
    expect(r.milestone).toBe("P4");
    expect(r.checks.find((c) => c.id === "TC-NFR-SEC-004")?.passed).toBe(true);
    expect(r.ready).toBe(true);
  });

  it("GET /api/v1/agent/readiness", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/readiness", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ready: boolean; checks: unknown[] };
    expect(json.ready).toBe(true);
    expect(json.checks.length).toBeGreaterThan(3);
  });
});
