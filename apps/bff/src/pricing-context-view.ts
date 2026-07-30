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
  const suggested = versions.find(
    (v) => v.state === "suggested" && v.channel === ch
  );
  const ctx = buildPricingContext(sku, channel, locale);
  const versionSlice = (
    v: (typeof versions)[number]
  ): NonNullable<typeof ctx.versions.active> => ({
    version_id: v.id,
    publish_price_mxn: v.publish_price_mxn,
    publish_price: formatMoney({
      locale,
      currency: "MXN",
      amount: v.publish_price_mxn,
    }),
    channel: v.channel as "MERCADO_LIBRE" | "AMAZON_MX",
  });
  if (active) {
    ctx.versions.active = versionSlice(active);
  }
  if (suggested) {
    ctx.versions.suggested = versionSlice(suggested);
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
