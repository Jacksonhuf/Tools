import type { FxRateRow } from "./fx-rate-table.js";

export function fxRatesToCsv(rows: FxRateRow[], exportedAt: string): string {
  const lines = [
    "exported_at,base,quote,rate,buffer_pct,effective_from,source",
  ];
  for (const r of rows) {
    lines.push(
      [
        exportedAt,
        r.base,
        r.quote,
        r.rate,
        r.buffer_pct,
        r.effective_from,
        r.source,
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
