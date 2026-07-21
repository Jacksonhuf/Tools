import { getListingIdForChannel } from "./fixtures.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { PriceVersionRecord } from "./version-store.js";

export interface RepricingQueueItem {
  version_id: string;
  listing_id: string;
  channel: string;
  state: PriceVersionRecord["state"];
  publish_price_mxn: number;
  created_at: string;
}

export async function listRepricingQueue(
  catalog: CatalogRepository,
  tenantId: string,
  skuId: string
): Promise<{ items: RepricingQueueItem[] }> {
  const sku = await catalog.getSku(tenantId, skuId);
  if (!sku) {
    throw new Error("SKU_NOT_FOUND");
  }
  const versions = await catalog.listVersions(skuId);
  const items: RepricingQueueItem[] = [];
  for (const v of versions) {
    if (v.state !== "suggested" && v.state !== "pending") {
      continue;
    }
    const listingId = getListingIdForChannel(
      v.channel as "MERCADO_LIBRE" | "AMAZON_MX"
    );
    if (!listingId) continue;
    items.push({
      version_id: v.id,
      listing_id: listingId,
      channel: v.channel,
      state: v.state,
      publish_price_mxn: v.publish_price_mxn,
      created_at: v.created_at,
    });
  }
  items.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return { items };
}

export async function promoteVersionsToPending(
  catalog: CatalogRepository,
  versionIds: string[]
): Promise<{ updated: RepricingQueueItem[]; skipped: string[] }> {
  const updated: RepricingQueueItem[] = [];
  const skipped: string[] = [];
  for (const versionId of versionIds) {
    const next = await catalog.updateVersionState(
      versionId,
      "suggested",
      "pending"
    );
    if (!next) {
      skipped.push(versionId);
      continue;
    }
    const listingId = getListingIdForChannel(
      next.channel as "MERCADO_LIBRE" | "AMAZON_MX"
    );
    if (!listingId) {
      skipped.push(versionId);
      continue;
    }
    updated.push({
      version_id: next.id,
      listing_id: listingId,
      channel: next.channel,
      state: next.state,
      publish_price_mxn: next.publish_price_mxn,
      created_at: next.created_at,
    });
  }
  return { updated, skipped };
}
