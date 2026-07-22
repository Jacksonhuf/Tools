import type { buildCompetitorAnchorSummary } from "./competitor-summary.js";

type CompetitorAnchorSummary = ReturnType<typeof buildCompetitorAnchorSummary>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function competitorAnchorToCsv(
  listingId: string,
  anchor: CompetitorAnchorSummary,
  exportedAt: string
): string {
  const lines = [
    "exported_at,listing_id,count,min_mxn,median_mxn,primary_mxn,buy_box_mxn",
  ];
  lines.push(
    [
      exportedAt,
      cell(listingId),
      anchor.count,
      cell(anchor.min_mxn),
      cell(anchor.median_mxn),
      cell(anchor.primary_mxn),
      cell(anchor.buy_box_mxn),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
