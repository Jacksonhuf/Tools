import type { buildListingDynamicRepricingRuleView } from "./dynamic-repricing-rule-view.js";

type DynamicRepricingRuleView = NonNullable<
  Awaited<ReturnType<typeof buildListingDynamicRepricingRuleView>>
>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function dynamicRepricingRuleToCsv(
  view: DynamicRepricingRuleView,
  exportedAt: string
): string {
  const r = view.rule;
  const lines = [
    "exported_at,listing_id,enabled,action,anchor_type,offset_type,offset_value,cooldown_min,daily_limit,min_gap_mxn,frozen,business_hours_only,competitor_stale_frozen,competitor_stale_since",
  ];
  lines.push(
    [
      exportedAt,
      cell(view.listing_id),
      r.enabled ? "true" : "false",
      cell(r.action),
      cell(r.anchor_type),
      cell(r.offset.type),
      r.offset.value,
      r.cooldown_min,
      r.daily_limit,
      r.min_gap_mxn,
      r.frozen ? "true" : "false",
      r.business_hours_only ? "true" : "false",
      view.stale.competitor_stale_frozen ? "true" : "false",
      cell(view.stale.competitor_stale_since),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
