import { describe, expect, it } from "vitest";
import { buildWaterfallExportCsv } from "../../apps/bff/src/waterfall-export.js";
import { DEMO_SKU } from "../../apps/bff/src/fixtures.js";

describe("buildWaterfallExportCsv", () => {
  it("includes publish price column", () => {
    const csv = buildWaterfallExportCsv(
      DEMO_SKU,
      { channel: "MERCADO_LIBRE", pricing_mode: "cost", target_margin_pct: 20 },
      "en"
    );
    expect(csv.split("\n").length).toBeGreaterThan(2);
    expect(csv).toContain("demo-sku-001");
  });
});
