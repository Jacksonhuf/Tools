import type { CategoryRuleTemplate } from "./category-rule-template.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function categoryRuleTemplatesToCsv(
  templates: CategoryRuleTemplate[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,category_id,name,action,anchor_type,defaults_json",
  ];
  for (const t of templates) {
    const d = t.defaults;
    lines.push(
      [
        exportedAt,
        cell(t.category_id),
        cell(t.name),
        cell(d.action ?? ""),
        cell(d.anchor_type ?? ""),
        cell(JSON.stringify(d)),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
