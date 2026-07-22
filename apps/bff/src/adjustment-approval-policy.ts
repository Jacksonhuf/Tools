import { computeCostReverse } from "@mx-pricing/pricing-engine";
import type { FeeTemplate } from "@mx-pricing/pricing-engine";

export function getAdjustmentApprovalPolicy() {
  return {
    max_drop_pct_without_approval: Number(process.env.APPROVAL_DROP_PCT ?? "5"),
    require_approval_below_target_margin: true,
  };
}

export function impliedMarginBelowTarget(input: {
  landed_cost_mxn: number;
  publish_price_mxn: number;
  fee_template: FeeTemplate;
  tax_strategy: "PRICE_INCLUDES_IVA" | "PRICE_EXCLUDES_IVA";
  iva_rate: number;
  target_margin_pct: number;
}): boolean {
  const { implied_margin_pct } = computeCostReverse({
    landed_cost_mxn: input.landed_cost_mxn,
    publish_price_mxn: input.publish_price_mxn,
    fee_template: input.fee_template,
    tax_strategy: input.tax_strategy,
    iva_rate: input.iva_rate,
  });
  return implied_margin_pct < input.target_margin_pct;
}
