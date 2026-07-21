export interface PublishPriceInput {
  shop: import("./types.js").ChannelShopRef;
  external_ref: string;
  price_mxn: number;
}

export interface PublishPriceResult {
  publish_status: "published" | "failed";
  channel_price_mxn?: number;
  error_code?: string;
  channel?: import("./types.js").SalesChannel;
}

export interface ListingPublishAdapter {
  publishPrice(input: PublishPriceInput): Promise<PublishPriceResult>;
}
