import { describe, expect, it } from "vitest";
import { computeLandedFromCostSheet } from "../../apps/bff/src/landed-cost-from-sheet.js";
import {
  createCostSheet,
  resetCostSheetsForTests,
} from "../../apps/bff/src/cost-sheet-store.js";
import { MemoryCatalogRepository } from "../../apps/bff/src/repositories/memory-catalog.js";

describe("computeLandedFromCostSheet USD path", () => {
  it("uses FX table for non-MXN COGS", async () => {
    resetCostSheetsForTests();
    const catalog = new MemoryCatalogRepository();
    const sheet = createCostSheet("tenant-demo", "demo-sku-001", {
      batch_no: "USD-1",
      cogs_amount: 100,
      cogs_currency: "USD",
    });
    const result = await computeLandedFromCostSheet(
      catalog,
      "tenant-demo",
      "demo-sku-001",
      sheet.id
    );
    expect(result.computed.cogs_mxn).toBe(2040);
    expect(result.tariff).toBeNull();
  });
});
