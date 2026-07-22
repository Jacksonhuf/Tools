import { computeLandedCost } from "@mx-pricing/pricing-engine";
import { getTariffHsRate } from "./tariff-hs-table.js";

export function computeLandedFromHs(
  tenantId: string,
  hsCode: string,
  input: {
    cogs_amount: number;
    cogs_currency?: string;
    freight_alloc_mxn?: number;
  }
) {
  const row = getTariffHsRate(tenantId, hsCode);
  if (!row) {
    throw new Error(`HS_CODE_NOT_FOUND:${hsCode}`);
  }
  const currency = input.cogs_currency ?? "MXN";
  const fx =
    currency === "MXN"
      ? { base: "MXN", quote: "MXN", rate: 1, buffer_pct: 0 }
      : { base: currency, quote: "MXN", rate: 1, buffer_pct: 0 };
  if (currency !== "MXN") {
    throw new Error("HS_LANDED_MXN_ONLY");
  }
  const result = computeLandedCost({
    cogs_amount: input.cogs_amount,
    cogs_currency: currency,
    fx,
    freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
    tariff_rate: row.tariff_rate,
    customs_fee_mxn: row.customs_fee_mxn,
  });
  return { tariff: row, computed: result };
}
