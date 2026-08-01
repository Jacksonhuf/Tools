import { describe, expect, it } from "vitest";
import { buildPriceWaterfallSteps } from "../../apps/bff/src/pricing-waterfall.js";
import { DEMO_SKU } from "../../apps/bff/src/fixtures.js";

const FEE = DEMO_SKU.fee_ml;

describe("buildPriceWaterfallSteps", () => {
  it("decomposes cost-mode list price down to landed cost", () => {
    const publish = 2044.75;
    const steps = buildPriceWaterfallSteps({
      publish_price_mxn: publish,
      landed_cost_mxn: DEMO_SKU.landed_cost_mxn,
      fee_template: FEE,
      tax_strategy: DEMO_SKU.policy.tax_strategy,
      iva_rate: DEMO_SKU.policy.iva_rate,
      target_margin_pct: 20,
    });

    expect(steps[0]).toMatchObject({
      layer_id: "LIST_PRICE",
      kind: "total",
      amount_mxn: publish,
    });
    expect(steps[steps.length - 1]).toMatchObject({
      layer_id: "LANDED",
      kind: "subtotal",
      amount_mxn: DEMO_SKU.landed_cost_mxn,
    });

    const decreases = steps.filter((s) => s.kind === "decrease");
    const peeled = decreases.reduce((sum, s) => sum + s.amount_mxn, 0);
    expect(peeled + DEMO_SKU.landed_cost_mxn).toBeCloseTo(publish, 0);

    const layerIds = steps.map((s) => s.layer_id);
    expect(layerIds).toContain("PLATFORM_COMMISSION");
    expect(layerIds).toContain("MERCHANT_MARGIN");
  });

  it("includes IVA layer when price includes tax", () => {
    const steps = buildPriceWaterfallSteps({
      publish_price_mxn: 2000,
      landed_cost_mxn: 1000,
      fee_template: FEE,
      tax_strategy: "PRICE_INCLUDES_IVA",
      iva_rate: 0.16,
      target_margin_pct: 20,
    });
    expect(steps.map((s) => s.layer_id)).toContain("IVA_DISPLAY");
  });
});
