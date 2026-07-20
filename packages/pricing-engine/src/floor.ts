import type { FeeTemplate, RoundingRule } from "./types.js";

export function feeRateOnPrice(template: FeeTemplate): number {
  return (
    (template.commission_pct_of_price + template.payment_pct_of_price) / 100
  );
}

/**
 * SDD §6.3 — contribution margin on list price P:
 * (P * (1 - feeRate) - fixed - landed) / P >= min_margin_pct/100
 */
export function computeFloorPrice(
  landed_cost_mxn: number,
  min_margin_pct: number,
  template: FeeTemplate
): number {
  const feeRate = feeRateOnPrice(template);
  const m = min_margin_pct / 100;
  const fixed = template.fulfillment_fixed_mxn;
  const denom = 1 - feeRate - m;
  if (denom <= 0) {
    throw new Error("INVALID_FLOOR_DENOMINATOR");
  }
  return (landed_cost_mxn + fixed) / denom;
}

export function roundPrice(
  raw_price_mxn: number,
  rule: RoundingRule
): number {
  if (rule.type === "NONE") {
    const factor = 10 ** rule.decimals;
    return Math.round(raw_price_mxn * factor) / factor;
  }
  if (rule.type === "END_99") {
    const whole = Math.floor(raw_price_mxn);
    let candidate = whole + 0.99;
    if (candidate > raw_price_mxn) {
      candidate = whole - 1 + 0.99;
    }
    return roundPrice(candidate, { type: "NONE", decimals: 2 });
  }
  return raw_price_mxn;
}

export function assertWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number
): boolean {
  if (tolerance <= 0) {
    return actual === expected;
  }
  const denom = Math.max(Math.abs(expected), 1e-9);
  return Math.abs(actual - expected) / denom <= tolerance;
}
