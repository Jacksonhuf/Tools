import type { CategoryRuleTemplate } from "./category-rule-template.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function skuCategoryRuleTemplateToCsv(
  skuId: string,
  categoryId: string | null,
  template: CategoryRuleTemplate | null,
  exportedAt: string
): string {
  const lines = [
    "exported_at,sku_id,category_id,template_name,action,anchor_type,defaults_json",
  ];
  if (!template) {
    lines.push(
      [
        exportedAt,
        cell(skuId),
        cell(categoryId),
        "",
        "",
        "",
        "",
      ].join(",")
    );
  } else {
    const d = template.defaults;
    lines.push(
      [
        exportedAt,
        cell(skuId),
        cell(template.category_id),
        cell(template.name),
        cell(d.action ?? ""),
        cell(d.anchor_type ?? ""),
        cell(JSON.stringify(d)),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
