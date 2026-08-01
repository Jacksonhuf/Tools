import { computeCostReverse } from "@mx-pricing/pricing-engine";
import type { FeeTemplate, TaxStrategy } from "@mx-pricing/pricing-engine";
import { roundPrice } from "@mx-pricing/pricing-engine";

export type WaterfallStepKind = "total" | "decrease" | "subtotal";

export interface WaterfallStep {
  layer_id: string;
  kind: WaterfallStepKind;
  /** Positive magnitude; decreases are amounts peeled off list price. */
  amount_mxn: number;
  /** Price level after applying this step (top of the next segment). */
  running_total_mxn: number;
}

const ROUNDING = { type: "NONE" as const, decimals: 2 };

function round(n: number): number {
  return roundPrice(n, ROUNDING);
}

/** Decompose list price into ladder steps from retail down to landed cost. */
export function buildPriceWaterfallSteps(input: {
  publish_price_mxn: number;
  landed_cost_mxn: number;
  fee_template: FeeTemplate;
  tax_strategy: TaxStrategy;
  iva_rate: number;
  target_margin_pct?: number;
}): WaterfallStep[] {
  const P = input.publish_price_mxn;
  const fee = input.fee_template;

  let ivaAmount = 0;
  if (input.tax_strategy === "PRICE_INCLUDES_IVA") {
    const netBeforeTax = P / (1 + input.iva_rate);
    ivaAmount = round(P - netBeforeTax);
  }

  const commission = round((P * fee.commission_pct_of_price) / 100);
  const payment = round((P * fee.payment_pct_of_price) / 100);
  const fulfillment = round(fee.fulfillment_fixed_mxn);

  let margin = 0;
  if (input.target_margin_pct !== undefined) {
    margin = round((P * input.target_margin_pct) / 100);
  } else {
    const { implied_margin_pct } = computeCostReverse({
      landed_cost_mxn: input.landed_cost_mxn,
      publish_price_mxn: P,
      fee_template: fee,
      tax_strategy: input.tax_strategy,
      iva_rate: input.iva_rate,
    });
    margin = round((P * implied_margin_pct) / 100);
  }

  // Reconcile so layers sum to list price (residual margin handles rounding).
  const residual = round(
    P - ivaAmount - commission - payment - fulfillment - input.landed_cost_mxn
  );
  if (Math.abs(residual - margin) > 0.05) {
    margin = Math.max(0, residual);
  }

  const steps: WaterfallStep[] = [];
  let running = P;

  steps.push({
    layer_id: "LIST_PRICE",
    kind: "total",
    amount_mxn: P,
    running_total_mxn: P,
  });

  const pushDecrease = (layer_id: string, amount: number) => {
    if (amount <= 0) return;
    running = round(running - amount);
    steps.push({
      layer_id,
      kind: "decrease",
      amount_mxn: amount,
      running_total_mxn: running,
    });
  };

  pushDecrease("IVA_DISPLAY", ivaAmount);
  pushDecrease("PLATFORM_COMMISSION", commission);
  pushDecrease("PAYMENT_FEE", payment);
  pushDecrease("FULFILLMENT", fulfillment);
  pushDecrease("MERCHANT_MARGIN", margin);

  steps.push({
    layer_id: "LANDED",
    kind: "subtotal",
    amount_mxn: input.landed_cost_mxn,
    running_total_mxn: input.landed_cost_mxn,
  });

  return steps;
}
