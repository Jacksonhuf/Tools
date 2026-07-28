import type {
  ChannelShopRef,
  ListingPullAdapter,
  ListingSnapshot,
} from "./types.js";
import type {
  ListingPublishAdapter,
  PublishPriceInput,
  PublishPriceResult,
} from "./publish-types.js";

const SP_API = process.env.AMAZON_SP_API_ENDPOINT?.trim() ||
  "https://sellingpartnerapi-na.amazon.com";

function requireToken(shop: ChannelShopRef): string {
  if (!shop.access_token?.trim()) {
    throw new Error("CHANNEL_AUTH_REQUIRED");
  }
  return shop.access_token;
}

export class AmazonMxListingAdapter implements ListingPullAdapter {
  async pullListing(
    shop: ChannelShopRef,
    externalRef: string
  ): Promise<ListingSnapshot> {
    const token = requireToken(shop);
    const sellerId = shop.external_seller_id;
    const sku = externalRef;
    const path = `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(sku)}`;
    const res = await fetch(`${SP_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-amz-access-token": token,
      },
    });
    if (!res.ok) {
      throw new Error("CHANNEL_UNAVAILABLE");
    }
    const json = (await res.json()) as {
      summaries?: Array<{ asin?: string; marketplaceId?: string }>;
      offers?: Array<{ price?: { amount?: number; currency?: string } }>;
    };
    const price = Number(json.offers?.[0]?.price?.amount ?? 0);
    const asin = json.summaries?.[0]?.asin ?? "B0UNKNOWN";
    return {
      external_item_id: sku,
      external_asin: asin,
      seller_sku: sku,
      price_mxn: price,
      currency: "MXN",
      synced_at: new Date().toISOString(),
    };
  }
}

export class AmazonMxPublishAdapter implements ListingPublishAdapter {
  async publishPrice(input: PublishPriceInput): Promise<PublishPriceResult> {
    if (!Number.isInteger(input.price_mxn)) {
      return { publish_status: "failed", error_code: "INVALID_PRICE_STEP" };
    }
    const token = requireToken(input.shop);
    const sellerId = input.shop.external_seller_id;
    const sku = input.external_ref;
    const path = `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(sku)}`;
    const res = await fetch(`${SP_API}${path}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-amz-access-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productType: "PRODUCT",
        patches: [
          {
            op: "replace",
            path: "/attributes/purchasable_offer",
            value: [
              {
                marketplace_id: process.env.AMAZON_MARKETPLACE_ID ?? "A1AM78C64UM0Y8",
                currency: "MXN",
                our_price: [{ schedule: [{ value_with_tax: input.price_mxn }] }],
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      return { publish_status: "failed", error_code: "CHANNEL_REJECTED" };
    }
    return {
      publish_status: "published",
      channel_price_mxn: input.price_mxn,
      channel: "AMAZON_MX",
    };
  }
}
