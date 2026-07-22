import type { AppLocale } from "@mx-pricing/i18n-format";
import type { SkuRecord } from "./fixtures.js";
import { runSimulate } from "./pricing-service.js";

type Channel = "MERCADO_LIBRE" | "AMAZON_MX";

export function buildWaterfallExportCsv(
  sku: SkuRecord,
  input: {
    channel: Channel;
    pricing_mode: string;
    target_margin_pct?: number;
    competitor_price_mxn?: number;
  },
  locale: AppLocale
): string {
  const sim = runSimulate(sku, input, locale);
  const header = "sku_id,channel,pricing_mode,layer_id,amount_mxn,publish_price_mxn";
  const lines = sim.waterfall.map((row) =>
    [
      sim.sku_id,
      sim.channel,
      sim.pricing_mode,
      row.layer_id,
      row.amount_mxn,
      sim.publish_price_mxn,
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export const WATERFALL_EXPORT_TEMPLATE_CSV =
  "sku_id,channel,pricing_mode,layer_id,amount_mxn,publish_price_mxn\n";
