import { describe, expect, it } from "vitest";
import { parseLandedCostCsv } from "../../apps/bff/src/landed-cost-import.js";

describe("parseLandedCostCsv", () => {
  it("parses header row", () => {
    const { rows, errors } = parseLandedCostCsv(
      "sku_id,landed_cost_mxn\ndemo-sku-001,999\n"
    );
    expect(errors).toEqual([]);
    expect(rows[0]?.sku_id).toBe("demo-sku-001");
    expect(rows[0]?.landed_cost_mxn).toBe(999);
  });
});
