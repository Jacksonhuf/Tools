import type { ChannelShopRef, ListingPullAdapter, ListingSnapshot } from "./types.js";
import { MockChannelListingAdapter } from "./mock-adapters.js";
import { parseListingPullHttpResponse } from "./http-response.js";

export class HttpStubChannelListingAdapter implements ListingPullAdapter {
  readonly fallback = new MockChannelListingAdapter();

  lastHttpRequest?: { url: string; body: unknown };

  async pullListing(
    shop: ChannelShopRef,
    externalRef: string
  ): Promise<ListingSnapshot> {
    const url = process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim();
    if (!url) {
      return this.fallback.pullListing(shop, externalRef);
    }
    const body = {
      channel: shop.channel,
      shop_id: shop.shop_id,
      external_ref: externalRef,
    };
    this.lastHttpRequest = { url, body };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`CHANNEL_HTTP_${res.status}`);
    }
    const json: unknown = await res.json();
    const parsed = parseListingPullHttpResponse(json, externalRef);
    if (!parsed) {
      throw new Error("CHANNEL_INVALID_HTTP_RESPONSE");
    }
    return parsed;
  }
}
