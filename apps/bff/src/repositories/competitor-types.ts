import type { SalesChannel } from "@mx-pricing/channel-adapters";

export interface CompetitorOfferRecord {
  id: string;
  listing_id: string;
  channel: SalesChannel;
  external_ref: string;
  seller_id: string | null;
  label: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface PriceObservationRecord {
  id: string;
  offer_id: string;
  observed_at: string;
  list_price: number | null;
  sale_price: number | null;
  shipping_addon: number;
  effective_price: number;
  currency: string;
  raw_json?: Record<string, unknown> | null;
}

export interface CompetitorRepository {
  readonly driver: "memory" | "postgres";
  listOffers(listingId: string): Promise<CompetitorOfferRecord[]>;
  getOffer(offerId: string): Promise<CompetitorOfferRecord | undefined>;
  createOffer(input: {
    listing_id: string;
    channel: SalesChannel;
    external_ref: string;
    seller_id?: string;
    label?: string;
    is_primary?: boolean;
  }): Promise<CompetitorOfferRecord>;
  addObservation(input: {
    offer_id: string;
    observed_at: string;
    list_price?: number | null;
    sale_price?: number | null;
    shipping_addon?: number;
    effective_price: number;
    currency?: string;
    raw_json?: Record<string, unknown>;
  }): Promise<PriceObservationRecord>;
  latestObservation(
    offerId: string
  ): Promise<PriceObservationRecord | undefined>;
  listObservations(
    listingId: string,
    since: Date
  ): Promise<PriceObservationRecord[]>;
  resetForTests?(): void;
}
