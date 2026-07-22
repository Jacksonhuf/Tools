import type { CatalogRepository } from "./repositories/index.js";
import type { DynamicRuleRepository } from "./repositories/dynamic-rule-types.js";
import type { ListingHealthRepository } from "./repositories/dynamic-rule-types.js";
import {
  applyCategoryDefaults,
  getCategoryRuleTemplate,
} from "./category-rule-template.js";

export async function buildListingDynamicRepricingRuleView(
  deps: {
    catalog: CatalogRepository;
    dynamicRules: DynamicRuleRepository;
    listingHealth: ListingHealthRepository;
  },
  tenantId: string,
  listingId: string
) {
  const listing = await deps.catalog.getListing(tenantId, listingId);
  if (!listing) {
    return null;
  }
  let rule = await deps.dynamicRules.getRule(listingId);
  if (!rule) {
    rule = await deps.dynamicRules.upsertRule(listingId, {});
  }
  const sku = await deps.catalog.getSku(tenantId, listing.sku.id);
  const categoryId = sku?.category_id;
  const template = categoryId
    ? getCategoryRuleTemplate(tenantId, categoryId)
    : undefined;
  const effective = applyCategoryDefaults(rule, template);
  const stale = await deps.listingHealth.getStale(listingId);
  return {
    listing_id: listingId,
    rule: effective,
    stale,
    category_template: template ?? null,
  };
}
