export type TaxStrategy = "PRICE_INCLUDES_IVA" | "PRICE_EXCLUDES_IVA";

export type RoundingRule =
  | { type: "NONE"; decimals: number }
  | { type: "END_99"; decimals: number };

export interface FeeTemplate {
  commission_pct_of_price: number;
  payment_pct_of_price: number;
  fulfillment_fixed_mxn: number;
}

export interface FxInput {
  base: string;
  quote: string;
  rate: number;
  buffer_pct: number;
}

export interface LandedCostInput {
  cogs_amount: number;
  cogs_currency: string;
  fx: FxInput;
  freight_alloc_mxn: number;
  tariff_rate: number;
  customs_fee_mxn: number;
}

export interface LandedCostResult {
  cogs_mxn: number;
  duty_mxn?: number;
  landed_cost_mxn: number;
}

export type Offset =
  | { type: "PERCENT"; value: number }
  | { type: "FIXED_MXN"; value: number };

export type Channel = "MERCADO_LIBRE" | "AMAZON_MX";

export type GuardCode =
  | "NEGATIVE_MARGIN"
  | "BELOW_MIN_MARGIN"
  | "BELOW_FLOOR"
  | "ABOVE_CEILING"
  | "COOLDOWN_ACTIVE"
  | "DAILY_LIMIT_EXCEEDED"
  | "STALE_COMPETITOR_DATA"
  | "CHANNEL_FROZEN"
  | "APPROVAL_REQUIRED";
