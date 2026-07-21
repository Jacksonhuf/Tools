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

export type RepricingShardRunResult = Exclude<
  Awaited<ReturnType<typeof runRepricingBatchShard>>,
  { error: "INVALID_SHARD" | "SKU_NOT_FOUND" }
>;

export async function runRepricingBatchAllShards(input: {
  catalog: CatalogRepository;
  competitors: CompetitorRepository;
  repricing: RepricingRepository;
  dynamicRules: DynamicRuleRepository;
  listingHealth: ListingHealthRepository;
  repricingActivity: RepricingActivityRepository;
  tenantId: string;
  skuId: string;
  shardTotal: number;
}): Promise<
  | { error: "SKU_NOT_FOUND" }
  | {
      sku_id: string;
      shard_total: number;
      shards: RepricingShardRunResult[];
      totals: { processed: number; skipped: number };
    }
> {
  const sku = await input.catalog.getSku(input.tenantId, input.skuId);
  if (!sku) {
    return { error: "SKU_NOT_FOUND" };
  }
  const shards: RepricingShardRunResult[] = [];
  for (let shardIndex = 0; shardIndex < input.shardTotal; shardIndex++) {
    const result = await runRepricingBatchShard({
      ...input,
      shardIndex,
    });
    if ("error" in result) {
      continue;
    }
    shards.push(result);
  }
  const processed = shards.reduce((n, s) => n + s.processed.length, 0);
  const skipped = shards.reduce((n, s) => n + s.skipped.length, 0);
  return {
    sku_id: input.skuId,
    shard_total: input.shardTotal,
    shards,
    totals: { processed, skipped },
  };
}

export async function runRepricingBatchForTenant(input: {
  catalog: CatalogRepository;
  competitors: CompetitorRepository;
  repricing: RepricingRepository;
  dynamicRules: DynamicRuleRepository;
  listingHealth: ListingHealthRepository;
  repricingActivity: RepricingActivityRepository;
  tenantId: string;
  shardTotal: number;
  skuIds?: string[];
}): Promise<{
  tenant_id: string;
  shard_total: number;
  skus: Array<
    | { sku_id: string; error: "SKU_NOT_FOUND" }
    | {
        sku_id: string;
        shard_total: number;
        shards: RepricingShardRunResult[];
        totals: { processed: number; skipped: number };
      }
  >;
  totals: { processed: number; skipped: number };
}> {
  const skuRecords = input.skuIds?.length
    ? (
        await Promise.all(
          input.skuIds.map((id) =>
            input.catalog.getSku(input.tenantId, id)
          )
        )
      ).map((sku, i) => ({ sku, id: input.skuIds![i] }))
    : (await input.catalog.listSkus(input.tenantId)).map((sku) => ({
        sku,
        id: sku.id,
      }));

  const skus: Array<
    | { sku_id: string; error: "SKU_NOT_FOUND" }
    | {
        sku_id: string;
        shard_total: number;
        shards: RepricingShardRunResult[];
        totals: { processed: number; skipped: number };
      }
  > = [];

  for (const { sku, id } of skuRecords) {
    if (!sku) {
      skus.push({ sku_id: id, error: "SKU_NOT_FOUND" });
      continue;
    }
    const run = await runRepricingBatchAllShards({
      catalog: input.catalog,
      competitors: input.competitors,
      repricing: input.repricing,
      dynamicRules: input.dynamicRules,
      listingHealth: input.listingHealth,
      repricingActivity: input.repricingActivity,
      tenantId: input.tenantId,
      skuId: sku.id,
      shardTotal: input.shardTotal,
    });
    if ("error" in run) {
      skus.push({ sku_id: sku.id, error: run.error });
      continue;
    }
    skus.push(run);
  }

  const processed = skus.reduce(
    (n, s) => n + ("totals" in s ? s.totals.processed : 0),
    0
  );
  const skipped = skus.reduce(
    (n, s) => n + ("totals" in s ? s.totals.skipped : 0),
    0
  );

  return {
    tenant_id: input.tenantId,
    shard_total: input.shardTotal,
    skus,
    totals: { processed, skipped },
  };
}
