import type { SalesChannel } from "@mx-pricing/channel-adapters";
import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import { resolveCompetitorIngestDriver } from "./competitor-ingest-config.js";

export type CompetitorPricePullResult = {
  sale_price: number;
  list_price?: number | null;
  shipping_addon?: number;
  buy_box_winner?: boolean;
  observed_at: string;
  source: string;
};

export function parseCompetitorIngestHttpResponse(
  json: unknown
): Omit<CompetitorPricePullResult, "source"> | null {
  if (!json || typeof json !== "object") return null;
  const body = json as {
    sale_price?: number;
    list_price?: number | null;
    shipping_addon?: number;
    buy_box_winner?: boolean;
    observed_at?: string;
    synced_at?: string;
  };
  if (typeof body.sale_price !== "number") return null;
  return {
    sale_price: body.sale_price,
    list_price: body.list_price ?? null,
    shipping_addon: body.shipping_addon,
    buy_box_winner: body.buy_box_winner,
    observed_at: body.observed_at ?? body.synced_at ?? new Date().toISOString(),
  };
}

export async function pullCompetitorPrice(input: {
  driver: ReturnType<typeof resolveCompetitorIngestDriver>;
  listingAdapter: ListingPullAdapter;
  channel: SalesChannel;
  externalRef: string;
  offerId: string;
  listingId: string;
  shop?: {
    shop_id: string;
    external_seller_id: string;
    access_token?: string;
  };
}): Promise<CompetitorPricePullResult> {
  const httpUrl = process.env.COMPETITOR_INGEST_HTTP_URL?.trim();
  if (input.driver === "http_stub" && httpUrl) {
    const res = await fetch(httpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: input.channel,
        external_ref: input.externalRef,
        offer_id: input.offerId,
        listing_id: input.listingId,
        shop_id: input.shop?.shop_id,
      }),
    });
    if (!res.ok) {
      throw new Error(`COMPETITOR_INGEST_HTTP_${res.status}`);
    }
    const parsed = parseCompetitorIngestHttpResponse(await res.json());
    if (!parsed) {
      throw new Error("COMPETITOR_INGEST_INVALID_HTTP_RESPONSE");
    }
    return { ...parsed, source: "http_stub" };
  }

  const shopRef = input.shop
    ? {
        shop_id: input.shop.shop_id,
        channel: input.channel,
        external_seller_id: input.shop.external_seller_id,
        access_token: input.shop.access_token,
      }
    : {
        shop_id: `ingest-${input.driver}`,
        channel: input.channel,
        external_seller_id: "INGEST",
      };

  const snap = await input.listingAdapter.pullListing(shopRef, input.externalRef);
  return {
    sale_price: snap.price_mxn,
    list_price: snap.price_mxn,
    shipping_addon: 0,
    buy_box_winner: input.channel === "AMAZON_MX",
    observed_at: snap.synced_at,
    source: input.driver === "channel" ? "channel_adapter" : "mock_listing_adapter",
  };
}
