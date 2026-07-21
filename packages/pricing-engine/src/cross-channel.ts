/**
 * P5-01 Cross-channel spread guard (Loop 37).
 */
export interface CrossChannelSpreadInput {
  mercado_libre_price_mxn: number | null;
  amazon_mx_price_mxn: number | null;
  max_spread_pct?: number;
}

export interface CrossChannelSpreadWarning {
  code: "CROSS_CHANNEL_SPREAD_EXCEEDED";
  spread_pct: number;
  max_spread_pct: number;
  mercado_libre_price_mxn: number;
  amazon_mx_price_mxn: number;
}

export function evaluateCrossChannelSpread(
  input: CrossChannelSpreadInput
): CrossChannelSpreadWarning | null {
  const maxSpread =
    input.max_spread_pct ??
    Number(process.env.CROSS_CHANNEL_MAX_SPREAD_PCT ?? "15");
  const ml = input.mercado_libre_price_mxn;
  const amz = input.amazon_mx_price_mxn;
  if (ml == null || amz == null || ml <= 0 || amz <= 0) {
    return null;
  }
  const min = Math.min(ml, amz);
  const max = Math.max(ml, amz);
  const spreadPct = ((max - min) / min) * 100;
  if (spreadPct <= maxSpread) {
    return null;
  }
  return {
    code: "CROSS_CHANNEL_SPREAD_EXCEEDED",
    spread_pct: Math.round(spreadPct * 100) / 100,
    max_spread_pct: maxSpread,
    mercado_libre_price_mxn: ml,
    amazon_mx_price_mxn: amz,
  };
}
