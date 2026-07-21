import { createHash } from "node:crypto";
import { listListingsForSku } from "./fixtures.js";
import type { CatalogRepository } from "./repositories/types.js";
import type { CompetitorRepository } from "./repositories/competitor-index.js";
import type { RepricingRepository } from "./repositories/repricing-types.js";
import type {
  DynamicRuleRepository,
  ListingHealthRepository,
} from "./repositories/dynamic-rule-types.js";
import type { RepricingActivityRepository } from "./repositories/repricing-activity-types.js";
import { processRepricingEvent } from "./repricing/runtime.js";

export function repricingShardIndex(
  listingId: string,
  shardTotal: number
): number {
  if (shardTotal < 1) return 0;
  const hash = createHash("sha256").update(listingId).digest();
  const num = hash.readUInt32BE(0);
  return num % shardTotal;
}

export function planRepricingShards(
  tenantId: string,
  skuId: string,
  shardTotal: number
) {
  const listings = listListingsForSku(tenantId, skuId);
  const shards: Array<{ shard_index: number; listing_ids: string[] }> = [];
  for (let i = 0; i < shardTotal; i++) {
    shards.push({ shard_index: i, listing_ids: [] });
  }
  for (const l of listings) {
    const idx = repricingShardIndex(l.id, shardTotal);
    shards[idx].listing_ids.push(l.id);
  }
  return {
    sku_id: skuId,
    shard_total: shardTotal,
    shards,
  };
}

export async function runRepricingBatchShard(input: {
  catalog: CatalogRepository;
  competitors: CompetitorRepository;
  repricing: RepricingRepository;
  dynamicRules: DynamicRuleRepository;
  listingHealth: ListingHealthRepository;
  repricingActivity: RepricingActivityRepository;
  tenantId: string;
  skuId: string;
  shardIndex: number;
  shardTotal: number;
}) {
  const plan = planRepricingShards(
    input.tenantId,
    input.skuId,
    input.shardTotal
  );
  const shard = plan.shards.find((s) => s.shard_index === input.shardIndex);
  if (!shard) {
    return { error: "INVALID_SHARD" as const };
  }
  const sku = await input.catalog.getSku(input.tenantId, input.skuId);
  if (!sku) {
    return { error: "SKU_NOT_FOUND" as const };
  }

  const processed: Array<{
    listing_id: string;
    event_id: string;
    result: string;
    version_id?: string;
  }> = [];
  const skipped: Array<{ listing_id: string; reason: string }> = [];

  for (const listingId of shard.listing_ids) {
    const events = await input.repricing.listEvents(
      input.tenantId,
      listingId,
      100
    );
    const pending = events.filter((e) => e.status === "pending");
    if (pending.length === 0) {
      skipped.push({ listing_id: listingId, reason: "no_pending_events" });
      continue;
    }
    for (const ev of pending) {
      try {
        const result = await processRepricingEvent(
          input.catalog,
          input.competitors,
          input.repricing,
          input.dynamicRules,
          input.listingHealth,
          input.repricingActivity,
          input.tenantId,
          ev.id
        );
        if ("skipped" in result && result.skipped) {
          processed.push({
            listing_id: listingId,
            event_id: ev.id,
            result: `skipped:${result.reason}`,
          });
        } else {
          processed.push({
            listing_id: listingId,
            event_id: ev.id,
            result: result.state,
            version_id: result.version_id,
          });
        }
      } catch (e) {
        skipped.push({
          listing_id: listingId,
          reason: String(e).slice(0, 80),
        });
      }
    }
  }

  return {
    sku_id: input.skuId,
    shard_index: input.shardIndex,
    shard_total: input.shardTotal,
    listing_ids: shard.listing_ids,
    processed,
    skipped,
  };
}
