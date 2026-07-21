export type SalesChannel = "MERCADO_LIBRE" | "AMAZON_MX";

export interface ListingSnapshot {
  external_item_id: string;
  external_asin?: string;
  seller_sku?: string;
  price_mxn: number;
  currency: "MXN";
  synced_at: string;
}

export interface ChannelShopRef {
  shop_id: string;
  channel: SalesChannel;
  external_seller_id: string;
}

export interface ListingPullAdapter {
  pullListing(
    shop: ChannelShopRef,
    externalRef: string
  ): Promise<ListingSnapshot>;
}
