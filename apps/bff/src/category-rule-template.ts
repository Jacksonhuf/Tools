import type { DynamicRuleRecord } from "./repositories/dynamic-rule-types.js";

export interface CategoryRuleTemplate {
  category_id: string;
  tenant_id: string;
  name: string;
  defaults: Partial<
    Pick<
      DynamicRuleRecord,
      | "action"
      | "anchor_type"
      | "offset"
      | "cooldown_min"
      | "daily_limit"
      | "min_gap_mxn"
      | "tier"
      | "business_hours_only"
    >
  >;
}

const TEMPLATES: CategoryRuleTemplate[] = [
  {
    category_id: "cat-electronics-mx",
    tenant_id: "tenant-demo",
    name: "Electronics MX default repricing",
    defaults: {
      action: "suggest",
      anchor_type: "median_competitor",
      offset: { type: "PERCENT", value: -2 },
      cooldown_min: 30,
      daily_limit: 12,
      min_gap_mxn: 5,
      tier: "standard",
      business_hours_only: true,
    },
  },
];

export function getCategoryRuleTemplate(
  tenantId: string,
  categoryId: string
): CategoryRuleTemplate | undefined {
  return TEMPLATES.find(
    (t) => t.tenant_id === tenantId && t.category_id === categoryId
  );
}

export function listCategoryRuleTemplates(
  tenantId: string
): CategoryRuleTemplate[] {
  return TEMPLATES.filter((t) => t.tenant_id === tenantId);
}

export function applyCategoryDefaults(
  rule: DynamicRuleRecord,
  template: CategoryRuleTemplate | undefined
): DynamicRuleRecord & { category_template_id: string | null } {
  if (!template) {
    return { ...rule, category_template_id: null };
  }
  const d = template.defaults;
  return {
    ...rule,
    category_template_id: template.category_id,
    action: d.action ?? rule.action,
    anchor_type: d.anchor_type ?? rule.anchor_type,
    offset: d.offset ?? rule.offset,
    cooldown_min: d.cooldown_min ?? rule.cooldown_min,
    daily_limit: d.daily_limit ?? rule.daily_limit,
    min_gap_mxn: d.min_gap_mxn ?? rule.min_gap_mxn,
    tier: d.tier ?? rule.tier,
    business_hours_only: d.business_hours_only ?? rule.business_hours_only,
  };
}
