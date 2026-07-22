import { describe, expect, it } from "vitest";
import { parseAdjustmentPriceCsv } from "../../apps/bff/src/adjustment-price-import.js";

describe("parseAdjustmentPriceCsv", () => {
  it("parses headered CSV", () => {
    const { rows, errors } = parseAdjustmentPriceCsv(
      "listing_id,explicit_price_mxn\nlisting-ml-001,1650\n"
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { listing_id: "listing-ml-001", explicit_price_mxn: 1650 },
    ]);
  });

  it("reports invalid price", () => {
    const { rows, errors } = parseAdjustmentPriceCsv(
      "listing_id,explicit_price_mxn\nlisting-ml-001,abc\n"
    );
    expect(rows.length).toBe(0);
    expect(errors.some((e) => e.includes("INVALID_PRICE"))).toBe(true);
  });
});
