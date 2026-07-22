import { describe, expect, it } from "vitest";
import { evaluateP5Readiness } from "../../apps/bff/src/p5-readiness.js";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("P5 readiness catalog", () => {
  it("evaluateP5Readiness is all green", () => {
    const r = evaluateP5Readiness();
    expect(r.ready).toBe(true);
    expect(r.checks.length).toBe(6);
  });
});

describe("GET /api/v1/product/readiness P5", () => {
  it("includes P5 milestone accepted", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/readiness", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      p5: { ready: boolean };
      milestones: Array<{ id: string; status: string }>;
      all_accepted: boolean;
    };
    expect(json.p5.ready).toBe(true);
    expect(json.milestones.find((m) => m.id === "P5")?.status).toBe(
      "accepted"
    );
    expect(json.all_accepted).toBe(true);
  });
});
