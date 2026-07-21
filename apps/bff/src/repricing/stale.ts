import type { CompetitorRepository } from "../repositories/competitor-index.js";
import type { ListingHealthRepository } from "../repositories/dynamic-rule-types.js";

export function staleThresholdMs(): number {
  const raw = process.env.COMPETITOR_STALE_MS;
  if (raw !== undefined) {
    return Number(raw);
  }
  return 24 * 60 * 60 * 1000;
}

export async function evaluateListingStale(
  competitors: CompetitorRepository,
  listingHealth: ListingHealthRepository,
  listingId: string
): Promise<{ stale: boolean; latest_observed_at: string | null }> {
  const offers = await competitors.listOffers(listingId);
  let latest: string | null = null;
  for (const offer of offers) {
    const obs = await competitors.latestObservation(offer.id);
    if (!obs) continue;
    if (!latest || new Date(obs.observed_at) > new Date(latest)) {
      latest = obs.observed_at;
    }
  }
  const threshold = staleThresholdMs();
  const now = Date.now();
  let stale = false;
  if (!latest) {
    stale = offers.length > 0;
  } else {
    stale = now - new Date(latest).getTime() > threshold;
  }
  await listingHealth.setStale(
    listingId,
    stale,
    stale ? latest ?? new Date().toISOString() : null
  );
  return { stale, latest_observed_at: latest };
}
