import { describe, expect, it } from "vitest";
import { evaluateCrossChannelSpread } from "@mx-pricing/pricing-engine";

describe("evaluateCrossChannelSpread", () => {
  it("TC-UNIT-XCH-001 returns null when spread within 15%", () => {
    expect(
      evaluateCrossChannelSpread({
        mercado_libre_price_mxn: 1600,
        amazon_mx_price_mxn: 1700,
        max_spread_pct: 15,
      })
    ).toBeNull();
  });

  it("TC-UNIT-XCH-002 warns when spread exceeds threshold", () => {
    const w = evaluateCrossChannelSpread({
      mercado_libre_price_mxn: 1600,
      amazon_mx_price_mxn: 2000,
      max_spread_pct: 15,
    });
    expect(w?.code).toBe("CROSS_CHANNEL_SPREAD_EXCEEDED");
    expect(w!.spread_pct).toBeGreaterThan(15);
  });
});
