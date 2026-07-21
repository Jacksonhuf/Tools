import type { PublishPriceResult } from "./publish-types.js";
import type { ListingSnapshot } from "./types.js";

export function parsePublishHttpResponse(json: unknown): PublishPriceResult | null {
  if (!json || typeof json !== "object") return null;
  const body = json as {
    publish_status?: string;
    channel_price_mxn?: number;
    error_code?: string;
    channel?: string;
  };
  if (body.publish_status === "published") {
    if (typeof body.channel_price_mxn !== "number") return null;
    return {
      publish_status: "published",
      channel_price_mxn: body.channel_price_mxn,
      channel:
        body.channel === "AMAZON_MX" || body.channel === "MERCADO_LIBRE"
          ? body.channel
          : undefined,
    };
  }
  if (body.publish_status === "failed") {
    return {
      publish_status: "failed",
      error_code:
        typeof body.error_code === "string" ? body.error_code : "CHANNEL_REJECTED",
    };
  }
  return null;
}

export function parseListingPullHttpResponse(
  json: unknown,
  externalRef: string
): ListingSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const body = json as {
    external_item_id?: string;
    price_mxn?: number;
    currency?: string;
    synced_at?: string;
    external_asin?: string;
    seller_sku?: string;
  };
  if (typeof body.price_mxn !== "number") return null;
  const now = new Date().toISOString();
  return {
    external_item_id: body.external_item_id ?? externalRef,
    external_asin: body.external_asin,
    seller_sku: body.seller_sku,
    price_mxn: body.price_mxn,
    currency: "MXN",
    synced_at: body.synced_at ?? now,
  };
}
