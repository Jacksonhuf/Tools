import type { SalesChannel } from "@mx-pricing/channel-adapters";
import type { ShopRepository } from "./repositories/shop-index.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { DynamicRuleRepository } from "./repositories/dynamic-rule-types.js";
import type { ListingPublishAdapter } from "@mx-pricing/channel-adapters";

const SHOP_BY_CHANNEL: Record<SalesChannel, string> = {
  MERCADO_LIBRE: "shop-ml-demo",
  AMAZON_MX: "shop-amz-demo",
};

export async function publishListingPrice(
  catalog: CatalogRepository,
  shops: ShopRepository,
  dynamicRules: DynamicRuleRepository,
  publisher: ListingPublishAdapter,
  tenantId: string,
  listingId: string,
  options: { version_id?: string; explicit_price_mxn?: number }
): Promise<
  | {
      publish_status: "published";
      channel_price_mxn: number;
      version_id: string;
    }
  | { publish_status: "failed"; error_code: string; rule_frozen?: boolean }
> {
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const shopId = SHOP_BY_CHANNEL[listing.channel as SalesChannel];
  const shop = await shops.getShop(tenantId, shopId);
  if (!shop || shop.auth_status !== "connected") {
    return { publish_status: "failed", error_code: "AUTH_REQUIRED" };
  }
  const token = await shops.getAccessToken(shopId);
  if (!token) {
    return { publish_status: "failed", error_code: "AUTH_EXPIRED" };
  }

  let price = options.explicit_price_mxn;
  let versionId = options.version_id ?? "";
  if (price === undefined) {
    const versions = await catalog.listVersions(listing.sku_id);
    const active = versions.find(
      (v: { state: string; channel: string }) =>
        v.state === "active" && v.channel === listing.channel
    );
    if (!active) {
      return { publish_status: "failed", error_code: "NO_ACTIVE_VERSION" };
    }
    price = active.publish_price_mxn;
    versionId = active.id;
  }

  const priceMxn = price as number;
  const result = await publisher.publishPrice({
    shop: {
      shop_id: shopId,
      channel: listing.channel as SalesChannel,
      external_seller_id: shop.external_seller_id!,
    },
    external_ref: listingId,
    price_mxn: priceMxn,
  });

  if (result.publish_status === "failed") {
    await dynamicRules.upsertRule(listingId, { frozen: true });
    return {
      publish_status: "failed",
      error_code: result.error_code ?? "PUBLISH_FAILED",
      rule_frozen: true,
    };
  }

  return {
    publish_status: "published",
    channel_price_mxn: result.channel_price_mxn ?? priceMxn,
    version_id: versionId,
  };
}
