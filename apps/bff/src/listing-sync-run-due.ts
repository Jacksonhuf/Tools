import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import type { CatalogRepository } from "./repositories/types.js";
import type { ShopRepository } from "./repositories/shop-types.js";
import type { ListingSyncJob } from "./listing-sync-journal.js";
import { runListingChannelSync } from "./listing-sync-service.js";
import {
  getListingSyncSchedule,
  markListingSyncScheduleRan,
} from "./listing-sync-schedule.js";

export const DEFAULT_LISTING_SYNC_REFS: Record<string, string> = {
  "listing-ml-001": "MLM123456",
  "listing-amz-001": "B0TEST123",
};

export type ListingSyncDueRun = {
  listing_id: string;
  external_ref: string;
  job: ListingSyncJob;
  error?: string;
};

export async function runDueListingChannelSyncs(
  catalog: CatalogRepository,
  shops: ShopRepository,
  listingAdapter: ListingPullAdapter,
  tenantId: string,
  options?: { force?: boolean }
): Promise<{ skipped: true } | { skipped: false; runs: ListingSyncDueRun[] }> {
  const schedule = getListingSyncSchedule(tenantId);
  if (!schedule.enabled && !options?.force) {
    return { skipped: true };
  }
  const runs: ListingSyncDueRun[] = [];
  for (const [listingId, external_ref] of Object.entries(
    DEFAULT_LISTING_SYNC_REFS
  )) {
    try {
      const result = await runListingChannelSync(
        catalog,
        shops,
        listingAdapter,
        tenantId,
        listingId,
        external_ref
      );
      runs.push({
        listing_id: listingId,
        external_ref,
        job: result.job,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (e) {
      const msg = String(e);
      runs.push({
        listing_id: listingId,
        external_ref,
        job: {
          id: `lsync-skip-${listingId}`,
          tenant_id: tenantId,
          listing_id: listingId,
          shop_id: "",
          external_ref,
          status: "failed",
          channel_price_mxn: null,
          error_code: msg.slice(0, 120),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        error: msg,
      });
    }
  }
  markListingSyncScheduleRan(tenantId);
  return { skipped: false, runs };
}
