import type { CatalogRepository } from "./repositories/types.js";
import { getCostSheet } from "./cost-sheet-store.js";
import { computeLandedFromFx } from "./landed-cost-fx.js";
import { computeLandedFromHs } from "./landed-cost-hs.js";

export async function computeLandedFromCostSheet(
  catalog: CatalogRepository,
  tenantId: string,
  skuId: string,
  sheetId: string,
  options?: { hs_code?: string }
) {
  const sheet = getCostSheet(tenantId, skuId, sheetId);
  if (!sheet) {
    throw new Error("COST_SHEET_NOT_FOUND");
  }
  const sku = await catalog.getSku(tenantId, skuId);
  if (!sku) {
    throw new Error("SKU_NOT_FOUND");
  }
  const currency = sheet.cogs_currency;
  if (currency === "MXN") {
    const hsCode = options?.hs_code ?? sku.hs_code;
    if (!hsCode) {
      throw new Error("HS_CODE_REQUIRED");
    }
    const { tariff, computed } = computeLandedFromHs(tenantId, hsCode, {
      cogs_amount: sheet.cogs_amount,
      cogs_currency: "MXN",
      freight_alloc_mxn: sheet.freight_alloc_mxn,
    });
    return { cost_sheet: sheet, tariff, computed };
  }
  const computed = computeLandedFromFx(tenantId, {
    cogs_amount: sheet.cogs_amount,
    cogs_currency: currency,
    freight_alloc_mxn: sheet.freight_alloc_mxn,
  });
  return { cost_sheet: sheet, computed, tariff: null };
}
