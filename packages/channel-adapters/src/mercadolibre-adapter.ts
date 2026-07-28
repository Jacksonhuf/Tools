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

const ML_API = "https://api.mercadolibre.com";

function requireToken(shop: ChannelShopRef): string {
  if (!shop.access_token?.trim()) {
    throw new Error("CHANNEL_AUTH_REQUIRED");
  }
  return shop.access_token;
}

export class MercadoLibreListingAdapter implements ListingPullAdapter {
  async pullListing(
    shop: ChannelShopRef,
    externalRef: string
  ): Promise<ListingSnapshot> {
    const token = requireToken(shop);
    const itemId = externalRef;
    const res = await fetch(`${ML_API}/items/${encodeURIComponent(itemId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("CHANNEL_UNAVAILABLE");
    }
    const json = (await res.json()) as {
      id?: string;
      price?: number;
      currency_id?: string;
    };
    const price = Number(json.price ?? 0);
    return {
      external_item_id: json.id ?? itemId,
      price_mxn: price,
      currency: "MXN",
      synced_at: new Date().toISOString(),
    };
  }
}

export class MercadoLibrePublishAdapter implements ListingPublishAdapter {
  async publishPrice(input: PublishPriceInput): Promise<PublishPriceResult> {
    const token = requireToken(input.shop);
    const itemId = input.external_ref;
    const res = await fetch(`${ML_API}/items/${encodeURIComponent(itemId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ price: input.price_mxn }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 400 && /price/i.test(text)) {
        return { publish_status: "failed", error_code: "INVALID_PRICE_STEP" };
      }
      return { publish_status: "failed", error_code: "CHANNEL_REJECTED" };
    }
    return {
      publish_status: "published",
      channel_price_mxn: input.price_mxn,
      channel: "MERCADO_LIBRE",
    };
  }
}
