import { describe, expect, it } from "vitest";
import { computeLandedCost } from "@mx-pricing/pricing-engine";

describe("computeLandedCost GL-COST-001", () => {
  it("matches golden fixture", () => {
    const r = computeLandedCost({
      cogs_amount: 100,
      cogs_currency: "USD",
      fx: { base: "USD", quote: "MXN", rate: 20, buffer_pct: 2 },
      freight_alloc_mxn: 0,
      tariff_rate: 0,
      customs_fee_mxn: 0,
    });
    expect(r.cogs_mxn).toBe(2040);
    expect(r.landed_cost_mxn).toBe(2040);
  });
});
