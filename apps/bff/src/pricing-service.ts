import {
  computeCompetitive,
  computeCostForward,
  computeFloorPrice,
  checkMinMargin,
  type GuardCode,
} from "@mx-pricing/pricing-engine";
import { formatMoney, type AppLocale } from "@mx-pricing/i18n-format";
import type { SkuRecord } from "./fixtures.js";

type Channel = "MERCADO_LIBRE" | "AMAZON_MX";

function feeForChannel(sku: SkuRecord, channel: Channel) {
  return channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
}

export function buildFloors(sku: SkuRecord) {
  const floor_ml = computeFloorPrice(
    sku.landed_cost_mxn,
    sku.policy.min_margin_pct,
    sku.fee_ml
  );
  const floor_amazon = computeFloorPrice(
    sku.landed_cost_mxn,
    sku.policy.min_margin_pct,
    sku.fee_amazon
  );
  return { floor_ml, floor_amazon };
}

export function runSimulate(
  sku: SkuRecord,
  body: {
    channel: Channel;
    pricing_mode: string;
    target_margin_pct?: number;
    target_price_mxn?: number;
    competitor_price_mxn?: number;
  },
  locale: AppLocale
) {
  const channel = body.channel;
  const fee = feeForChannel(sku, channel);
  const { floor_ml, floor_amazon } = buildFloors(sku);
  const floor = channel === "MERCADO_LIBRE" ? floor_ml : floor_amazon;

  const rounding_rule = { type: "NONE" as const, decimals: 2 };
  const guards: GuardCode[] = [];

  let publish_price_mxn: number;
  let waterfall: Array<{ layer_id: string; amount_mxn: number }>;

  if (
    body.pricing_mode === "competitive" ||
    body.pricing_mode === "competitive_with_floor"
  ) {
    const comp = computeCompetitive({
      pricing_mode: body.pricing_mode,
      channel,
      match_price_mxn: body.competitor_price_mxn,
      floor_price_mxn: floor,
      rounding_rule,
    });
    publish_price_mxn = comp.publish_price_mxn;
    waterfall = [
      { layer_id: "LANDED", amount_mxn: sku.landed_cost_mxn },
      { layer_id: "MATCH_PRICE", amount_mxn: body.competitor_price_mxn ?? 0 },
      { layer_id: "LIST_PRICE", amount_mxn: publish_price_mxn },
    ];
    if (comp.floor_binding_applied) {
      waterfall.splice(2, 0, {
        layer_id: "FLOOR_BINDING",
        amount_mxn: floor,
      });
    }
  } else {
    const margin = body.target_margin_pct ?? sku.policy.target_margin_pct;
    const forward = computeCostForward({
      pricing_mode: "cost",
      landed_cost_mxn: sku.landed_cost_mxn,
      target_margin_pct: margin,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate,
      rounding_rule,
    });
    publish_price_mxn = forward.publish_price_mxn;
    waterfall = [
      { layer_id: "LANDED", amount_mxn: sku.landed_cost_mxn },
      { layer_id: "TARGET_PROFIT", amount_mxn: margin },
      { layer_id: "LIST_PRICE", amount_mxn: publish_price_mxn },
    ];
  }

  const guard = checkMinMargin({
    landed_cost_mxn: sku.landed_cost_mxn,
    publish_price_mxn,
    min_margin_pct: sku.policy.min_margin_pct,
    fee_template: fee,
    tax_strategy: sku.policy.tax_strategy,
    iva_rate: sku.policy.iva_rate,
  });
  if (guard) guards.push(guard);

  const money = (amount: number) =>
    formatMoney({ locale, currency: "MXN", amount });

  return {
    sku_id: sku.id,
    channel,
    pricing_mode: body.pricing_mode,
    publish_price_mxn,
    publish_price: money(publish_price_mxn),
    floor_price_mxn: floor,
    floor_price: money(floor),
    waterfall,
    guards,
  };
}

export function buildPricingContext(
  sku: SkuRecord,
  channel: Channel | undefined,
  locale: AppLocale
) {
  const { floor_ml, floor_amazon } = buildFloors(sku);
  const money = (amount: number) =>
    formatMoney({ locale, currency: "MXN", amount });

  const costActive = computeCostForward({
    pricing_mode: "cost",
    landed_cost_mxn: sku.landed_cost_mxn,
    target_margin_pct: sku.policy.target_margin_pct,
    fee_template: sku.fee_ml,
    tax_strategy: sku.policy.tax_strategy,
    iva_rate: sku.policy.iva_rate,
    rounding_rule: { type: "NONE", decimals: 2 },
  });

  const defaultActive: {
    version_id?: string;
    publish_price_mxn: number;
    publish_price: ReturnType<typeof money>;
    channel: "MERCADO_LIBRE" | "AMAZON_MX";
  } = {
    publish_price_mxn: costActive.publish_price_mxn,
    publish_price: money(costActive.publish_price_mxn),
    channel: "MERCADO_LIBRE" as const,
  };

  return {
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      name: sku.name,
      landed_cost_mxn: sku.landed_cost_mxn,
      landed_cost: money(sku.landed_cost_mxn),
      formatted: money(sku.landed_cost_mxn).formatted,
    },
    policy: sku.policy,
    floors: {
      mercado_libre: {
        amount_mxn: floor_ml,
        ...money(floor_ml),
      },
      amazon_mx: {
        amount_mxn: floor_amazon,
        ...money(floor_amazon),
      },
    },
    channel: channel ?? null,
    listings: [],
    versions: {
      suggested: null,
      active: defaultActive,
    },
  };
}
