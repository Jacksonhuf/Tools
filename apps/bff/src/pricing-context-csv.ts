import type { buildSkuPricingContextView } from "./pricing-context-view.js";

type PricingContextView = NonNullable<
  Awaited<ReturnType<typeof buildSkuPricingContextView>>
>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function pricingContextToCsv(
  view: PricingContextView,
  exportedAt: string
): string {
  const ctx = view.context;
  const active = ctx.versions.active;
  const competitors = ctx as typeof ctx & {
    competitors?: {
      offers?: unknown[];
      anchor?: { median_mxn?: number | null; buy_box_mxn?: number | null };
    };
  };
  const anchor = competitors.competitors?.anchor;
  const offerCount = competitors.competitors?.offers?.length ?? 0;
  const lines = [
    "exported_at,sku_id,channel,landed_cost_mxn,active_version_id,active_price_mxn,floor_ml_mxn,floor_amz_mxn,anchor_median_mxn,competitor_offer_count",
  ];
  lines.push(
    [
      exportedAt,
      cell(view.sku_id),
      cell(view.channel),
      ctx.sku.landed_cost_mxn,
      cell(active.version_id ?? ""),
      active.publish_price_mxn,
      ctx.floors.mercado_libre.amount_mxn,
      ctx.floors.amazon_mx.amount_mxn,
      anchor?.median_mxn ?? "",
      offerCount,
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
