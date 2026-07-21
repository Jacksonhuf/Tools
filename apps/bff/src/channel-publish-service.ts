import type { SalesChannel } from "@mx-pricing/channel-adapters";
import type { ShopRepository } from "./repositories/shop-index.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { DynamicRuleRepository } from "./repositories/dynamic-rule-types.js";
import type { ListingPublishAdapter } from "@mx-pricing/channel-adapters";
import { normalizePriceForChannel } from "./channel-price-step.js";
import {
  buildPublishIdempotencyKey,
  getStoredPublishOutcome,
  storePublishOutcome,
} from "./publish-idempotency-store.js";
import {
  isChannelSandboxEnabled,
  recordChannelSandboxEvent,
} from "./channel-sandbox-ledger.js";

export const LISTING_ID_BY_SHOP: Record<string, string> = {
  "shop-ml-demo": "listing-ml-001",
  "shop-amz-demo": "listing-amz-001",
};

const SHOP_BY_CHANNEL: Record<SalesChannel, string> = {
  MERCADO_LIBRE: "shop-ml-demo",
  AMAZON_MX: "shop-amz-demo",
};

export type PublishListingSuccess = {
  publish_status: "published";
  channel_price_mxn: number;
  version_id: string;
  retried?: boolean;
  channel: SalesChannel;
  idempotent_replay?: boolean;
};

export type PublishListingFailure = {
  publish_status: "failed";
  error_code: string;
  rule_frozen?: boolean;
  idempotent_replay?: boolean;
};

function rememberIdempotent(
  tenantId: string,
  listingId: string,
  idempotencyKey: string | undefined,
  outcome: PublishListingSuccess | PublishListingFailure
): PublishListingSuccess | PublishListingFailure {
  if (!idempotencyKey) {
    return outcome;
  }
  const { idempotent_replay: _drop, ...stored } = outcome;
  storePublishOutcome(
    buildPublishIdempotencyKey(tenantId, listingId, idempotencyKey),
    stored
  );
  return outcome;
}

export async function publishListingPrice(
  catalog: CatalogRepository,
  shops: ShopRepository,
  dynamicRules: DynamicRuleRepository,
  publisher: ListingPublishAdapter,
  tenantId: string,
  listingId: string,
  options: {
    version_id?: string;
    explicit_price_mxn?: number;
    retry_on_step?: boolean;
    idempotency_key?: string;
  }
): Promise<PublishListingSuccess | PublishListingFailure> {
  if (options.idempotency_key) {
    const cached = getStoredPublishOutcome(
      buildPublishIdempotencyKey(
        tenantId,
        listingId,
        options.idempotency_key
      )
    );
    if (cached) {
      return { ...cached, idempotent_replay: true };
    }
  }

  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const channel = listing.channel as SalesChannel;
  const shopId = SHOP_BY_CHANNEL[channel];
  const shop = await shops.getShop(tenantId, shopId);
  if (!shop || shop.auth_status !== "connected") {
    return rememberIdempotent(tenantId, listingId, options.idempotency_key, {
      publish_status: "failed",
      error_code: "AUTH_REQUIRED",
    });
  }
  const token = await shops.getAccessToken(shopId);
  if (!token) {
    return rememberIdempotent(tenantId, listingId, options.idempotency_key, {
      publish_status: "failed",
      error_code: "AUTH_EXPIRED",
    });
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
      if (versionId) {
        await catalog.setVersionChannelPublishStatus(versionId, "skipped");
      }
      return rememberIdempotent(tenantId, listingId, options.idempotency_key, {
        publish_status: "failed",
        error_code: "NO_ACTIVE_VERSION",
      });
    }
    price = active.publish_price_mxn;
    versionId = active.id;
  }

  const priceMxn = price as number;
  const shopRef = {
    shop_id: shopId,
    channel,
    external_seller_id: shop.external_seller_id!,
  };

  let result = await publisher.publishPrice({
    shop: shopRef,
    external_ref: listingId,
    price_mxn: priceMxn,
  });

  let retried = false;
  if (
    result.publish_status === "failed" &&
    result.error_code === "INVALID_PRICE_STEP" &&
    options.retry_on_step
  ) {
    const adjusted = normalizePriceForChannel(channel, priceMxn);
    if (adjusted !== priceMxn) {
      result = await publisher.publishPrice({
        shop: shopRef,
        external_ref: listingId,
        price_mxn: adjusted,
      });
      retried = true;
    }
  }

  if (result.publish_status === "failed") {
    if (result.error_code === "CHANNEL_REJECTED") {
      await dynamicRules.upsertRule(listingId, { frozen: true });
    }
    if (versionId) {
      await catalog.setVersionChannelPublishStatus(versionId, "failed");
    }
    return rememberIdempotent(tenantId, listingId, options.idempotency_key, {
      publish_status: "failed",
      error_code: result.error_code ?? "PUBLISH_FAILED",
      rule_frozen: result.error_code === "CHANNEL_REJECTED",
    });
  }

  if (versionId) {
    await catalog.setVersionChannelPublishStatus(versionId, "published");
  }

  if (isChannelSandboxEnabled()) {
    recordChannelSandboxEvent({
      tenant_id: tenantId,
      listing_id: listingId,
      channel,
      event_type: "channel_publish",
      payload: {
        channel_price_mxn: result.channel_price_mxn ?? priceMxn,
        version_id: versionId,
        retried,
        sandbox: true,
      },
    });
  }

  return rememberIdempotent(tenantId, listingId, options.idempotency_key, {
    publish_status: "published",
    channel_price_mxn: result.channel_price_mxn ?? priceMxn,
    version_id: versionId,
    retried,
    channel,
  });
}

export type BatchListingPublishStatus = "published" | "failed" | "skipped";

export interface BatchPublishItem {
  listing_id: string;
  channel: SalesChannel;
  publish_status: BatchListingPublishStatus;
  channel_price_mxn?: number;
  error_code?: string;
  rule_frozen?: boolean;
  retried?: boolean;
  version_id?: string;
  version_channel_publish_status?: BatchListingPublishStatus;
  idempotent_replay?: boolean;
}

export type BatchPublishAggregateStatus =
  | "all_published"
  | "partial_success"
  | "all_failed";

export async function publishListingPriceBatch(
  catalog: CatalogRepository,
  shops: ShopRepository,
  dynamicRules: DynamicRuleRepository,
  publisher: ListingPublishAdapter,
  tenantId: string,
  listingIds: string[],
  options: { retry_on_step?: boolean; idempotency_key?: string }
): Promise<{
  publish_status: BatchPublishAggregateStatus;
  items: BatchPublishItem[];
}> {
  const items: BatchPublishItem[] = [];
  for (const listingId of listingIds) {
    try {
      const perListingKey = options.idempotency_key
        ? `${options.idempotency_key}:${listingId}`
        : undefined;
      const result = await publishListingPrice(
        catalog,
        shops,
        dynamicRules,
        publisher,
        tenantId,
        listingId,
        {
          retry_on_step: options.retry_on_step ?? true,
          idempotency_key: perListingKey,
        }
      );
      if (result.publish_status === "published") {
        items.push({
          listing_id: listingId,
          channel: result.channel,
          publish_status: "published",
          channel_price_mxn: result.channel_price_mxn,
          retried: result.retried,
          version_id: result.version_id,
          version_channel_publish_status: "published",
          idempotent_replay: result.idempotent_replay,
        });
      } else {
        const listing = await catalog.getListing(tenantId, listingId);
        const channel = (listing?.channel ?? "MERCADO_LIBRE") as SalesChannel;
        const skipped = result.error_code === "NO_ACTIVE_VERSION";
        items.push({
          listing_id: listingId,
          channel,
          publish_status: skipped ? "skipped" : "failed",
          error_code: result.error_code,
          rule_frozen: result.rule_frozen,
          version_channel_publish_status: skipped ? "skipped" : "failed",
          idempotent_replay: result.idempotent_replay,
        });
      }
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw e;
      }
      items.push({
        listing_id: listingId,
        channel: "MERCADO_LIBRE",
        publish_status: "failed",
        error_code: "PUBLISH_FAILED",
      });
    }
  }

  const published = items.filter((i) => i.publish_status === "published").length;
  const failedOrSkipped = items.length - published;
  let publish_status: BatchPublishAggregateStatus = "all_published";
  if (published === 0 && failedOrSkipped > 0) {
    publish_status = "all_failed";
  } else if (published > 0 && failedOrSkipped > 0) {
    publish_status = "partial_success";
  }

  return { publish_status, items };
}
