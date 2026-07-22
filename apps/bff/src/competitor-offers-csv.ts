import type { CompetitorOfferRecord } from "./repositories/competitor-types.js";

export type CompetitorOfferCsvRow = CompetitorOfferRecord & {
  latest_effective_mxn: number | null;
  latest_observed_at: string | null;
};

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function competitorOffersToCsv(
  listingId: string,
  offers: CompetitorOfferCsvRow[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,listing_id,offer_id,external_ref,channel,label,is_primary,latest_effective_mxn,latest_observed_at,created_at",
  ];
  for (const o of offers) {
    lines.push(
      [
        exportedAt,
        cell(listingId),
        cell(o.id),
        cell(o.external_ref),
        cell(o.channel),
        cell(o.label),
        o.is_primary ? "true" : "false",
        cell(o.latest_effective_mxn),
        cell(o.latest_observed_at),
        cell(o.created_at),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
