import type {
  CompetitorOfferRecord,
  CompetitorRepository,
  PriceObservationRecord,
} from "./competitor-types.js";
import type { SalesChannel } from "@mx-pricing/channel-adapters";

let offerSeq = 0;
let obsSeq = 0;
const offers = new Map<string, CompetitorOfferRecord>();
const observations = new Map<string, PriceObservationRecord[]>();

function clearPrimary(listingId: string) {
  for (const o of offers.values()) {
    if (o.listing_id === listingId && o.is_primary) {
      offers.set(o.id, { ...o, is_primary: false });
    }
  }
}

export class MemoryCompetitorRepository implements CompetitorRepository {
  readonly driver = "memory" as const;

  async listOffers(listingId: string): Promise<CompetitorOfferRecord[]> {
    return [...offers.values()].filter((o) => o.listing_id === listingId);
  }

  async getOffer(offerId: string): Promise<CompetitorOfferRecord | undefined> {
    return offers.get(offerId);
  }

  async createOffer(input: {
    listing_id: string;
    channel: SalesChannel;
    external_ref: string;
    seller_id?: string;
    label?: string;
    is_primary?: boolean;
  }): Promise<CompetitorOfferRecord> {
    if (input.is_primary) {
      clearPrimary(input.listing_id);
    }
    offerSeq += 1;
    const id = `coff-${offerSeq}`;
    const record: CompetitorOfferRecord = {
      id,
      listing_id: input.listing_id,
      channel: input.channel,
      external_ref: input.external_ref,
      seller_id: input.seller_id ?? null,
      label: input.label ?? null,
      is_primary: input.is_primary ?? false,
      created_at: new Date().toISOString(),
    };
    offers.set(id, record);
    observations.set(id, []);
    return record;
  }

  async addObservation(input: {
    offer_id: string;
    observed_at: string;
    list_price?: number | null;
    sale_price?: number | null;
    shipping_addon?: number;
    effective_price: number;
    currency?: string;
    raw_json?: Record<string, unknown>;
  }): Promise<PriceObservationRecord> {
    obsSeq += 1;
    const record: PriceObservationRecord = {
      id: `obs-${obsSeq}`,
      offer_id: input.offer_id,
      observed_at: input.observed_at,
      list_price: input.list_price ?? null,
      sale_price: input.sale_price ?? null,
      shipping_addon: input.shipping_addon ?? 0,
      effective_price: input.effective_price,
      currency: input.currency ?? "MXN",
    };
    const list = observations.get(input.offer_id) ?? [];
    list.push(record);
    observations.set(input.offer_id, list);
    return record;
  }

  async latestObservation(
    offerId: string
  ): Promise<PriceObservationRecord | undefined> {
    const list = observations.get(offerId) ?? [];
    if (list.length === 0) return undefined;
    return [...list].sort(
      (a, b) =>
        new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
    )[0];
  }

  async listObservations(
    listingId: string,
    since: Date
  ): Promise<PriceObservationRecord[]> {
    const listingOffers = await this.listOffers(listingId);
    const out: PriceObservationRecord[] = [];
    for (const o of listingOffers) {
      const list = observations.get(o.id) ?? [];
      for (const obs of list) {
        if (new Date(obs.observed_at) >= since) {
          out.push(obs);
        }
      }
    }
    return out.sort(
      (a, b) =>
        new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
    );
  }

  resetForTests(): void {
    offers.clear();
    observations.clear();
    offerSeq = 0;
    obsSeq = 0;
  }
}
