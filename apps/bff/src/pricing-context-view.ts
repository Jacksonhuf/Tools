import type { AppLocale } from "@mx-pricing/i18n-format";
import { formatMoney } from "@mx-pricing/i18n-format";
import { getListingIdForChannel } from "./fixtures.js";
import {
  buildCompetitorAnchorSummary,
  mapOffersWithLatestObservations,
} from "./competitor-summary.js";
import { buildPricingContext } from "./pricing-service.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { CompetitorRepository } from "./repositories/competitor-index.js";

export async function buildSkuPricingContextView(
  deps: {
    catalog: CatalogRepository;
    competitors: CompetitorRepository;
  },
  tenantId: string,
  skuId: string,
  locale: AppLocale,
  channel?: "MERCADO_LIBRE" | "AMAZON_MX"
) {
  const sku = await deps.catalog.getSku(tenantId, skuId);
  if (!sku) {
    return null;
  }
  const versions = await deps.catalog.listVersions(sku.id);
  const ch = channel ?? "MERCADO_LIBRE";
  const active = versions.find(
    (v) => v.state === "active" && v.channel === ch
  );
  const ctx = buildPricingContext(sku, channel, locale);
  if (active) {
    ctx.versions.active = {
      version_id: active.id,
      publish_price_mxn: active.publish_price_mxn,
      publish_price: formatMoney({
        locale,
        currency: "MXN",
        amount: active.publish_price_mxn,
      }),
      channel: active.channel as "MERCADO_LIBRE" | "AMAZON_MX",
    };
  }
  const listingId = getListingIdForChannel(ch);
  if (listingId) {
    const withLatest = await mapOffersWithLatestObservations(
      deps.competitors,
      listingId
    );
    Object.assign(ctx, {
      competitors: {
        offers: withLatest,
        anchor: buildCompetitorAnchorSummary(withLatest),
      },
    });
  }
  return { sku_id: skuId, channel: ch, context: ctx };
}
