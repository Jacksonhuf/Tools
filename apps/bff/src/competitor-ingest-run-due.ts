import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import { DEMO_SKU, listListingsForSku } from "./fixtures.js";
import type { CatalogRepository } from "./repositories/types.js";
import type { CompetitorRepository } from "./repositories/competitor-index.js";
import type { RepricingRepository } from "./repositories/repricing-types.js";
import type { ListingHealthRepository } from "./repositories/dynamic-rule-types.js";
import type { ShopRepository } from "./repositories/shop-types.js";
import { LISTING_ID_BY_SHOP } from "./channel-publish-service.js";
import {
  IngestFailedError,
  runCompetitorIngest,
} from "./repricing/runtime.js";

const SHOP_BY_LISTING: Record<string, string> = Object.fromEntries(
  Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop])
);

export type CompetitorIngestDueRun = {
  listing_id: string;
  observations_created: number;
  tier: string;
  error?: string;
};

export async function runDueCompetitorIngest(
  deps: {
    catalog: CatalogRepository;
    competitors: CompetitorRepository;
    repricing: RepricingRepository;
    listingHealth: ListingHealthRepository;
    shops: ShopRepository;
    listingAdapter: ListingPullAdapter;
  },
  tenantId: string,
  options?: { force?: boolean }
): Promise<{ runs: CompetitorIngestDueRun[] }> {
  const listings = listListingsForSku(tenantId, DEMO_SKU.id);
  const now = Date.now();
  const runs: CompetitorIngestDueRun[] = [];

  for (const listing of listings) {
    const schedule = await deps.repricing.getIngestSchedule(listing.id);
    if (
      !options?.force &&
      schedule &&
      new Date(schedule.next_run_at).getTime() > now
    ) {
      continue;
    }
    try {
      const result = await runCompetitorIngest(
        deps.catalog,
        deps.competitors,
        deps.repricing,
        deps.listingHealth,
        deps.shops,
        deps.listingAdapter,
        tenantId,
        listing.id
      );
      runs.push({
        listing_id: listing.id,
        observations_created: result.observations_created,
        tier: result.tier,
      });
    } catch (e) {
      if (e instanceof IngestFailedError) {
        runs.push({
          listing_id: listing.id,
          observations_created: 0,
          tier: schedule?.tier ?? "T1",
          error: "INGEST_FAILED",
        });
        continue;
      }
      runs.push({
        listing_id: listing.id,
        observations_created: 0,
        tier: schedule?.tier ?? "T1",
        error: String(e).slice(0, 120),
      });
    }
  }

  return { runs };
}
