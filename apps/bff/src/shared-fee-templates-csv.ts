import type { SharedFeeTemplate } from "./tenant-fee-template-share.js";

function cell(value: string | number): string {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function sharedFeeTemplatesToCsv(
  templates: SharedFeeTemplate[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,template_id,channel,category_id,name,commission_pct,payment_pct,fulfillment_fixed_mxn",
  ];
  for (const t of templates) {
    lines.push(
      [
        exportedAt,
        cell(t.id),
        cell(t.channel),
        cell(t.category_id),
        cell(t.name),
        t.template.commission_pct_of_price,
        t.template.payment_pct_of_price,
        t.template.fulfillment_fixed_mxn,
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
