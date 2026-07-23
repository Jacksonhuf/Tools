import { describe, expect, it } from "vitest";
import { costSheetsToCsv } from "../../apps/bff/src/cost-sheets-csv.js";

describe("costSheetsToCsv single row", () => {
  it("includes batch_no", () => {
    const csv = costSheetsToCsv(
      [
        {
          id: "cs-1",
          tenant_id: "tenant-demo",
          sku_id: "demo-sku-001",
          batch_no: "B-1",
          cogs_amount: 100,
          cogs_currency: "MXN",
          freight_alloc_mxn: 0,
          freight_alloc_rule: "PER_UNIT",
          effective_from: "2026-07-22T00:00:00.000Z",
          source: "test",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("B-1");
  });
});
