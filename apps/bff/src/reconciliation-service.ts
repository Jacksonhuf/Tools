import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import { LISTING_ID_BY_SHOP } from "./channel-publish-service.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { ShopRepository } from "./repositories/shop-index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";

const SHOP_BY_LISTING: Record<string, string> = Object.fromEntries(
  Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop])
);

export async function reconcileListingChannelPrice(
  catalog: CatalogRepository,
  shops: ShopRepository,
  listingAdapter: ListingPullAdapter,
  alerts: ReconciliationAlertRepository,
  tenantId: string,
  listingId: string,
  input: { external_ref: string; tolerance_mxn?: number }
): Promise<
  | {
      status: "ok";
      active_price_mxn: number;
      channel_price_mxn: number;
    }
  | {
      status: "mismatch";
      active_price_mxn: number;
      channel_price_mxn: number;
      delta_mxn: number;
      alert_id: string;
    }
> {
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

  const versions = await catalog.listVersions(listing.sku_id);
  const active = versions.find(
    (v) => v.state === "active" && v.channel === listing.channel
  );
  if (!active) {
    throw new Error("NO_ACTIVE_VERSION");
  }

  const snapshot = await listingAdapter.pullListing(
    {
      shop_id: shopId,
      channel: shop.channel,
      external_seller_id: shop.external_seller_id,
    },
    input.external_ref
  );

  const tolerance = input.tolerance_mxn ?? 0;
  const delta = snapshot.price_mxn - active.publish_price_mxn;
  if (Math.abs(delta) <= tolerance) {
    return {
      status: "ok",
      active_price_mxn: active.publish_price_mxn,
      channel_price_mxn: snapshot.price_mxn,
    };
  }

  const alert = await alerts.createAlert({
    tenant_id: tenantId,
    listing_id: listingId,
    channel: listing.channel,
    active_price_mxn: active.publish_price_mxn,
    channel_price_mxn: snapshot.price_mxn,
    delta_mxn: delta,
    severity: "warning",
  });

  return {
    status: "mismatch",
    active_price_mxn: active.publish_price_mxn,
    channel_price_mxn: snapshot.price_mxn,
    delta_mxn: delta,
    alert_id: alert.id,
  };
}
