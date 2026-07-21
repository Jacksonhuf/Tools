import type {
  ChannelShopRef,
  ListingPullAdapter,
  ListingSnapshot,
  SalesChannel,
} from "./types.js";

const MOCK_PRICES: Record<SalesChannel, number> = {
  MERCADO_LIBRE: 1599,
  AMAZON_MX: 1549,
};

export class MockChannelListingAdapter implements ListingPullAdapter {
  /** Override pull price by external ref (TC-INT-RECON-001) */
  priceByRef = new Map<string, number>();

  /** Next pullListing throws CHANNEL_UNAVAILABLE (TC-NFR-REL-003) */
  failNextPull = false;

  async pullListing(
    shop: ChannelShopRef,
    externalRef: string
  ): Promise<ListingSnapshot> {
    if (this.failNextPull) {
      this.failNextPull = false;
      throw new Error("CHANNEL_UNAVAILABLE");
    }
    const now = new Date().toISOString();
    const price =
      this.priceByRef.get(externalRef) ?? MOCK_PRICES[shop.channel];
    if (shop.channel === "AMAZON_MX") {
      return {
        external_item_id: externalRef,
        external_asin: externalRef.startsWith("B0") ? externalRef : "B0MOCK001",
        seller_sku: "MX-DEMO-001",
        price_mxn: price,
        currency: "MXN",
        synced_at: now,
      };
    }
    return {
      external_item_id: externalRef,
      price_mxn: price,
      currency: "MXN",
      synced_at: now,
    };
  }
}
