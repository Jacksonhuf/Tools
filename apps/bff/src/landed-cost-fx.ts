import { computeLandedCost } from "@mx-pricing/pricing-engine";
import { getFxRate } from "./fx-rate-table.js";

export function computeLandedFromFx(
  tenantId: string,
  input: {
    cogs_amount: number;
    cogs_currency: string;
    freight_alloc_mxn?: number;
    tariff_rate?: number;
    customs_fee_mxn?: number;
  }
) {
  const quote = "MXN";
  const fxRow = getFxRate(tenantId, input.cogs_currency, quote);
  if (!fxRow) {
    throw new Error(`FX_RATE_NOT_FOUND:${input.cogs_currency}/${quote}`);
  }
  return computeLandedCost({
    cogs_amount: input.cogs_amount,
    cogs_currency: input.cogs_currency,
    fx: {
      base: fxRow.base,
      quote: fxRow.quote,
      rate: fxRow.rate,
      buffer_pct: fxRow.buffer_pct,
    },
    freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
    tariff_rate: input.tariff_rate ?? 0,
    customs_fee_mxn: input.customs_fee_mxn ?? 0,
  });
}
