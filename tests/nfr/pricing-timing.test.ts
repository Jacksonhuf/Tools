import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetPricingNfrMetricsForTests } from "../../apps/bff/src/pricing-nfr-metrics.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-NFR-PERF-002 pricing simulate latency scaffold", () => {
  it("records simulate duration under 3s locally", async () => {
    resetPricingNfrMetricsForTests();
    const { app } = createTestApp();
    const t0 = performance.now();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/pricing/simulate",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ explicit_price_mxn: 1599 }),
      }
    );
    expect(res.status).toBe(200);
    expect(performance.now() - t0).toBeLessThan(3000);
    const metrics = await app.request("/api/v1/ops/metrics", {
      headers: { ...AUTH, ...TENANT },
    });
    const json = (await metrics.json()) as {
      nfr: { pricing_simulate_count: number };
    };
    expect(json.nfr.pricing_simulate_count).toBeGreaterThanOrEqual(1);
  });
});
