import { planRepricingShards } from "./repricing-batch-shard.js";

type RepricingShardPlan = ReturnType<typeof planRepricingShards>;

function cell(value: string | number): string {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function repricingBatchShardPlanToCsv(
  plan: RepricingShardPlan,
  exportedAt: string
): string {
  const lines = [
    "exported_at,sku_id,shard_total,shard_index,listing_id",
  ];
  for (const shard of plan.shards) {
    for (const listingId of shard.listing_ids) {
      lines.push(
        [
          exportedAt,
          cell(plan.sku_id),
          plan.shard_total,
          shard.shard_index,
          cell(listingId),
        ].join(",")
      );
    }
  }
  if (lines.length === 1) {
    lines.push(
      [exportedAt, cell(plan.sku_id), plan.shard_total, "", ""].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
