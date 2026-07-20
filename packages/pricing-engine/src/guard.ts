import type { FeeTemplate, GuardCode } from "./types.js";
import { computeCostReverse } from "./cost.js";
import type { TaxStrategy } from "./types.js";

export interface MinMarginGuardInput {
  landed_cost_mxn: number;
  publish_price_mxn: number;
  min_margin_pct: number;
  fee_template: FeeTemplate;
  tax_strategy: TaxStrategy;
  iva_rate: number;
}

export function checkMinMargin(input: MinMarginGuardInput): GuardCode | null {
  const { implied_margin_pct } = computeCostReverse({
    landed_cost_mxn: input.landed_cost_mxn,
    publish_price_mxn: input.publish_price_mxn,
    fee_template: input.fee_template,
    tax_strategy: input.tax_strategy,
    iva_rate: input.iva_rate,
  });
  if (implied_margin_pct < 0) {
    return "NEGATIVE_MARGIN";
  }
  if (implied_margin_pct < input.min_margin_pct) {
    return "BELOW_MIN_MARGIN";
  }
  return null;
}
