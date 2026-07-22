import type { TariffHsRow } from "./tariff-hs-table.js";

export function tariffHsRatesToCsv(
  rows: TariffHsRow[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,hs_code,description,tariff_rate,customs_fee_mxn",
  ];
  for (const r of rows) {
    lines.push(
      [
        exportedAt,
        r.hs_code,
        r.description.replace(/"/g, '""'),
        r.tariff_rate,
        r.customs_fee_mxn,
      ]
        .map((v) =>
          typeof v === "string" && /[",\n]/.test(v) ? `"${v}"` : String(v)
        )
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
