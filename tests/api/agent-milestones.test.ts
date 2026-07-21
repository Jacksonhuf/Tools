import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("GET /api/v1/agent/milestones", () => {
  it("marks P3 and P4 accepted when readiness passes", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/milestones", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      milestones: Array<{ id: string; status: string }>;
      p3_readiness: { ready: boolean };
      p4_readiness: { ready: boolean };
    };
    expect(json.p3_readiness.ready).toBe(true);
    expect(json.p4_readiness.ready).toBe(true);
    expect(json.milestones.find((m) => m.id === "P3")?.status).toBe(
      "accepted"
    );
    expect(json.milestones.find((m) => m.id === "P4")?.status).toBe(
      "accepted"
    );
  });
});
