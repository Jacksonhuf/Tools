import { roundPrice } from "./floor.js";
import type { FeeTemplate, RoundingRule, TaxStrategy } from "./types.js";

export interface CostForwardInput {
  pricing_mode: string;
  landed_cost_mxn: number;
  target_margin_pct: number;
  fee_template: FeeTemplate;
  tax_strategy: TaxStrategy;
  iva_rate: number;
  rounding_rule: RoundingRule;
  override_net_before_tax_mxn?: number;
}

export interface CostForwardResult {
  publish_price_mxn: number;
  layers?: Record<string, { amount_mxn: number }>;
}

/** SDD §6.4 — fees and margin as % of list price */
export function computeCostForward(input: CostForwardInput): CostForwardResult {
  const {
    landed_cost_mxn,
    target_margin_pct,
    fee_template,
    tax_strategy,
    iva_rate,
    rounding_rule,
    override_net_before_tax_mxn,
  } = input;

  const feePct =
    fee_template.commission_pct_of_price +
    fee_template.payment_pct_of_price +
    target_margin_pct;
  const denom = 1 - feePct / 100;

  let netBeforeTax: number;
  if (override_net_before_tax_mxn !== undefined) {
    netBeforeTax = override_net_before_tax_mxn;
  } else {
    if (denom <= 0) {
      throw new Error("INVALID_COST_FORWARD_DENOMINATOR");
    }
    netBeforeTax =
      (landed_cost_mxn + fee_template.fulfillment_fixed_mxn) / denom;
  }

  let publish: number;
  const layers: Record<string, { amount_mxn: number }> = {};

  if (tax_strategy === "PRICE_INCLUDES_IVA") {
    publish = netBeforeTax * (1 + iva_rate);
    const ivaAmount = publish - netBeforeTax;
    layers.IVA_DISPLAY = { amount_mxn: roundPrice(ivaAmount, rounding_rule) };
    layers.LIST_PRICE = { amount_mxn: roundPrice(publish, rounding_rule) };
    publish = layers.LIST_PRICE.amount_mxn;
  } else {
    publish = netBeforeTax;
    publish = roundPrice(publish, rounding_rule);
    layers.LIST_PRICE = { amount_mxn: publish };
  }

  return { publish_price_mxn: publish, layers };
}

export interface CostReverseInput {
  landed_cost_mxn: number;
  publish_price_mxn: number;
  fee_template: FeeTemplate;
  tax_strategy: TaxStrategy;
  iva_rate: number;
}

export function computeCostReverse(input: CostReverseInput): {
  implied_margin_pct: number;
} {
  const { landed_cost_mxn, publish_price_mxn, fee_template, tax_strategy, iva_rate } =
    input;
  let listPrice = publish_price_mxn;
  if (tax_strategy === "PRICE_INCLUDES_IVA") {
    listPrice = publish_price_mxn;
  }
  const feeRate =
    (fee_template.commission_pct_of_price +
      fee_template.payment_pct_of_price) /
    100;
  const net =
    listPrice * (1 - feeRate) - fee_template.fulfillment_fixed_mxn;
  const implied_margin_pct = ((net - landed_cost_mxn) / listPrice) * 100;
  return { implied_margin_pct };
}
