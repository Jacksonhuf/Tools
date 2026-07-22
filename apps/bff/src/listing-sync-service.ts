import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import { LISTING_ID_BY_SHOP } from "./channel-publish-service.js";
import type { CatalogRepository } from "./repositories/types.js";
import type { ShopRepository } from "./repositories/shop-types.js";
import { listListingSyncJobs, recordListingSyncJob } from "./listing-sync-journal.js";

const SHOP_BY_LISTING: Record<string, string> = Object.fromEntries(
  Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop])
);

export async function runListingChannelSync(
  catalog: CatalogRepository,
  shops: ShopRepository,
  listingAdapter: ListingPullAdapter,
  tenantId: string,
  listingId: string,
  external_ref: string
) {
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const shopId = SHOP_BY_LISTING[listingId];
  const shop = shopId ? await shops.getShop(tenantId, shopId) : undefined;
  if (!shop || shop.auth_status !== "connected" || !shop.external_seller_id) {
    throw new Error("AUTH_REQUIRED");
  }
  const token = await shops.getAccessToken(shopId);
  if (!token) {
    throw new Error("AUTH_EXPIRED");
  }
  const started = new Date().toISOString();
  try {
    const snapshot = await listingAdapter.pullListing(
      {
        shop_id: shopId,
        channel: shop.channel,
        external_seller_id: shop.external_seller_id,
      },
      external_ref
    );
    const job = recordListingSyncJob({
      tenant_id: tenantId,
      listing_id: listingId,
      shop_id: shopId,
      external_ref,
      status: "ok",
      channel_price_mxn: snapshot.price_mxn,
      error_code: null,
      started_at: started,
      finished_at: new Date().toISOString(),
    });
    return { snapshot, job };
  } catch (e) {
    const job = recordListingSyncJob({
      tenant_id: tenantId,
      listing_id: listingId,
      shop_id: shopId,
      external_ref,
      status: "failed",
      channel_price_mxn: null,
      error_code: String(e).slice(0, 120),
      started_at: started,
      finished_at: new Date().toISOString(),
    });
    return { snapshot: null, job, error: String(e) };
  }
}

export { listListingSyncJobs };
