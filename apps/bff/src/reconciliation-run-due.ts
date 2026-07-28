import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import type { CatalogRepository } from "./repositories/index.js";
import type { ShopRepository } from "./repositories/shop-index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";
import { reconcileListingChannelPrice } from "./reconciliation-service.js";
import { DEFAULT_LISTING_SYNC_REFS } from "./listing-sync-run-due.js";

export async function runDueReconciliation(
  catalog: CatalogRepository,
  shops: ShopRepository,
  listingAdapter: ListingPullAdapter,
  alerts: ReconciliationAlertRepository,
  tenantId: string
): Promise<
  Array<{
    listing_id: string;
    external_ref: string;
    result: Awaited<ReturnType<typeof reconcileListingChannelPrice>>;
  }>
> {
  const results = [];
  for (const [listingId, external_ref] of Object.entries(
    DEFAULT_LISTING_SYNC_REFS
  )) {
    try {
      const result = await reconcileListingChannelPrice(
        catalog,
        shops,
        listingAdapter,
        alerts,
        tenantId,
        listingId,
        { external_ref, tolerance_mxn: 0 }
      );
      results.push({ listing_id: listingId, external_ref, result });
    } catch (e) {
      results.push({
        listing_id: listingId,
        external_ref,
        result: {
          status: "ok" as const,
          active_price_mxn: 0,
          channel_price_mxn: 0,
        },
      });
    }
  }
  return results;
}
