import type { CostSheetRecord } from "./cost-sheet-store.js";

export function costSheetsToCsv(
  sheets: CostSheetRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,id,sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn,freight_alloc_rule,effective_from,source",
  ];
  for (const s of sheets) {
    lines.push(
      [
        exportedAt,
        s.id,
        s.sku_id,
        s.batch_no,
        s.cogs_amount,
        s.cogs_currency,
        s.freight_alloc_mxn,
        s.freight_alloc_rule,
        s.effective_from,
        s.source,
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
