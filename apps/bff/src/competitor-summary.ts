import { aggregateAnchor } from "@mx-pricing/pricing-engine";
import type { CompetitorRepository } from "./repositories/competitor-types.js";
import type { CompetitorOfferRecord } from "./repositories/competitor-types.js";
import { observationBuyBoxWinner } from "./competitor-buy-box.js";

export async function mapOffersWithLatestObservations(
  competitors: CompetitorRepository,
  listingId: string
) {
  const offers = await competitors.listOffers(listingId);
  return Promise.all(
    offers.map(async (o) => {
      const latest = await competitors.latestObservation(o.id);
      return {
        ...o,
        latest_effective_mxn: latest?.effective_price ?? null,
        latest_observed_at: latest?.observed_at ?? null,
        latest_observation: latest,
      };
    })
  );
}

export function buildCompetitorAnchorSummary(
  offers: Array<
    CompetitorOfferRecord & {
      latest_effective_mxn: number | null;
      latest_observation?: import("./repositories/competitor-types.js").PriceObservationRecord;
    }
  >
) {
  const prices = offers
    .map((o) => o.latest_effective_mxn)
    .filter((p): p is number => p !== null && p > 0);
  if (prices.length === 0) {
    return {
      count: 0,
      min_mxn: null,
      median_mxn: null,
      primary_mxn: null,
      buy_box_mxn: null,
    };
  }
  const primary = offers.find((o) => o.is_primary)?.latest_effective_mxn ?? null;
  const buyBoxOffers = offers.filter((o) =>
    observationBuyBoxWinner(o.latest_observation)
  );
  const buy_box_mxn =
    buyBoxOffers.length > 0
      ? Math.min(
          ...buyBoxOffers
            .map((o) => o.latest_effective_mxn)
            .filter((p): p is number => p !== null && p > 0)
        )
      : null;
  return {
    count: prices.length,
    min_mxn: aggregateAnchor("min", prices),
    median_mxn: aggregateAnchor("median", prices),
    primary_mxn: primary,
    buy_box_mxn,
  };
}
