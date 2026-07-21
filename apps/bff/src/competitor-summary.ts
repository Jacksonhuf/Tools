import { aggregateAnchor } from "@mx-pricing/pricing-engine";
import type { CompetitorOfferRecord } from "./repositories/competitor-types.js";

export function buildCompetitorAnchorSummary(
  offers: Array<
    CompetitorOfferRecord & { latest_effective_mxn: number | null }
  >
) {
  const prices = offers
    .map((o) => o.latest_effective_mxn)
    .filter((p): p is number => p !== null && p > 0);
  if (prices.length === 0) {
    return { count: 0, min_mxn: null, median_mxn: null, primary_mxn: null };
  }
  const primary = offers.find((o) => o.is_primary)?.latest_effective_mxn ?? null;
  return {
    count: prices.length,
    min_mxn: aggregateAnchor("min", prices),
    median_mxn: aggregateAnchor("median", prices),
    primary_mxn: primary,
  };
}
