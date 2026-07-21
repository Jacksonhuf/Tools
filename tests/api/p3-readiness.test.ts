import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("GET /api/v1/product/readiness", () => {
  it("returns P3 and P4 readiness", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/readiness", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      p3: { ready: boolean };
      p4: { ready: boolean };
      milestones: Array<{ id: string; status: string }>;
    };
    expect(json.p3.ready).toBe(true);
    expect(json.p4.ready).toBe(true);
    expect(
      json.milestones.every((m) => m.status === "accepted")
    ).toBe(true);
  });
});
