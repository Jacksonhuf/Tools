import type { PriceObservationRecord } from "./repositories/competitor-types.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function priceHistoryToCsv(
  listingId: string,
  observations: PriceObservationRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,listing_id,observation_id,offer_id,observed_at,effective_price,sale_price,shipping_addon,currency",
  ];
  for (const o of observations) {
    lines.push(
      [
        exportedAt,
        cell(listingId),
        cell(o.id),
        cell(o.offer_id),
        cell(o.observed_at),
        o.effective_price,
        cell(o.sale_price),
        o.shipping_addon,
        cell(o.currency),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
