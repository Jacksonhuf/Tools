import type { buildListingIngestStatus } from "./listing-ingest-status.js";

type ListingIngestStatus = NonNullable<
  Awaited<ReturnType<typeof buildListingIngestStatus>>
>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function listingIngestStatusToCsv(
  status: ListingIngestStatus,
  exportedAt: string
): string {
  const lines = [
    "exported_at,listing_id,tier,next_run_at,interval_ms,ingest_failed,ingest_failed_at",
  ];
  lines.push(
    [
      exportedAt,
      cell(status.listing_id),
      cell(status.tier),
      cell(status.next_run_at),
      status.interval_ms,
      status.ingest_failed ? "true" : "false",
      cell(status.ingest_failed_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
