import { describe, expect, it } from "vitest";
import { repricingBatchShardPlanToCsv } from "../../apps/bff/src/repricing-batch-shard-plan-csv.js";
import { skuCategoryRuleTemplateToCsv } from "../../apps/bff/src/sku-category-rule-template-csv.js";
import { planRepricingShards } from "../../apps/bff/src/repricing-batch-shard.js";
import { getCategoryRuleTemplate } from "../../apps/bff/src/category-rule-template.js";

describe("repricingBatchShardPlanToCsv", () => {
  it("includes shard_index", () => {
    const plan = planRepricingShards("tenant-demo", "demo-sku-001", 2);
    const csv = repricingBatchShardPlanToCsv(plan, "2026-07-22T12:00:00.000Z");
    expect(csv).toContain("shard_index");
  });
});

describe("skuCategoryRuleTemplateToCsv", () => {
  it("includes template_name when present", () => {
    const template = getCategoryRuleTemplate(
      "tenant-demo",
      "cat-electronics-mx"
    );
    const csv = skuCategoryRuleTemplateToCsv(
      "demo-sku-001",
      "cat-electronics-mx",
      template ?? null,
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("Electronics MX default repricing");
  });
});
