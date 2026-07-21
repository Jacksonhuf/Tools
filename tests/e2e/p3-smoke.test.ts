import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { evaluateP3Readiness } from "../../apps/bff/src/p3-readiness.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("P3 readiness catalog", () => {
  it("evaluateP3Readiness is all green", () => {
    const r = evaluateP3Readiness();
    expect(r.ready).toBe(true);
    expect(r.checks.length).toBeGreaterThan(6);
  });
});

describe("TC-E2E-OPS-002 P3 smoke chain", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.reconciliationAlerts.resetForTests?.();
  });

  it("publish → reconcile → milestones P3 accepted", async () => {
    const { app } = createTestApp();

    const milestonesBefore = await app.request("/api/v1/agent/milestones", {
      headers: { ...AUTH, ...TENANT },
    });
    const m0 = (await milestonesBefore.json()) as {
      milestones: Array<{ id: string; status: string }>;
      p3_readiness: { ready: boolean };
    };
    expect(m0.p3_readiness.ready).toBe(true);
    expect(m0.milestones.find((x) => x.id === "P3")?.status).toBe("accepted");

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

    const publish = await app.request(
      "/api/v1/listings/listing-ml-001/channel-publish",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ idempotency_key: "loop27-smoke" }),
      }
    );
    expect(publish.status).toBe(200);

    const product = await app.request("/api/v1/product/readiness", {
      headers: { ...AUTH, ...TENANT },
    });
    const pr = (await product.json()) as { all_accepted: boolean };
    expect(pr.all_accepted).toBe(true);
  });
});
