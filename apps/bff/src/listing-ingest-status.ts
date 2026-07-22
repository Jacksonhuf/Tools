import type { CatalogRepository } from "./repositories/index.js";
import type { RepricingRepository } from "./repositories/repricing-index.js";
import type { ListingHealthRepository } from "./repositories/dynamic-rule-types.js";
import { ensureIngestSchedule } from "./repricing/runtime.js";
import { tierIntervalMs } from "./repricing/tier.js";

export async function buildListingIngestStatus(
  deps: {
    catalog: CatalogRepository;
    repricing: RepricingRepository;
    listingHealth: ListingHealthRepository;
  },
  tenantId: string,
  listingId: string
) {
  const listing = await deps.catalog.getListing(tenantId, listingId);
  if (!listing) {
    return null;
  }
  const schedule = await ensureIngestSchedule(deps.repricing, listingId);
  const guard = await deps.listingHealth.getIngestGuard(listingId);
  return {
    listing_id: listingId,
    tier: schedule.tier,
    next_run_at: schedule.next_run_at,
    interval_ms: tierIntervalMs(schedule.tier),
    ...guard,
  };
}
