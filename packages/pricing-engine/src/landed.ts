import type { LandedCostInput, LandedCostResult } from "./types.js";

/** SDD §6.2 */
export function computeLandedCost(input: LandedCostInput): LandedCostResult {
  const { cogs_amount, fx, freight_alloc_mxn, tariff_rate, customs_fee_mxn } =
    input;
  const bufferMultiplier = 1 + fx.buffer_pct / 100;
  const cogs_mxn = cogs_amount * fx.rate * bufferMultiplier;
  const duty_mxn = cogs_mxn * tariff_rate;
  const landed_cost_mxn =
    cogs_mxn + freight_alloc_mxn + duty_mxn + customs_fee_mxn;

  const result: LandedCostResult = { cogs_mxn, landed_cost_mxn };
  if (tariff_rate > 0) {
    result.duty_mxn = duty_mxn;
  }
  return result;
}
