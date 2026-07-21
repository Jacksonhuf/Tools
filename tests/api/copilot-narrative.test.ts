import { describe, expect, it } from "vitest";
import { buildPricingContextNarrative } from "../../apps/bff/src/copilot-narrative.js";

describe("buildPricingContextNarrative", () => {
  it("cites version_id and formatted prices", () => {
    const text = buildPricingContextNarrative(
      {
        sku: {
          name: "Demo",
          landed_cost: { formatted: "$100.00" },
        },
        versions: {
          active: {
            version_id: "ver-abc",
            publish_price: { formatted: "$120.00" },
            channel: "MERCADO_LIBRE",
          },
        },
        competitors: { anchor: { count: 2, median_mxn: 115 } },
      },
      "en"
    );
    expect(text).toContain("ver-abc");
    expect(text).toContain("$120.00");
    expect(text).toContain("median 115");
  });
});
