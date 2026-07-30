export type CompetitorIngestDriver = "mock" | "http_stub" | "channel";

const DRIVER_ALIASES: Record<string, CompetitorIngestDriver> = {
  mock: "mock",
  http_stub: "http_stub",
  http: "http_stub",
  channel: "channel",
  live: "channel",
};

export function resolveCompetitorIngestDriver(
  raw?: string | null
): CompetitorIngestDriver {
  const key = (raw ?? process.env.COMPETITOR_INGEST_DRIVER ?? "mock")
    .trim()
    .toLowerCase();
  return DRIVER_ALIASES[key] ?? "mock";
}

export function isCompetitorCompliantScrapeEnabled(): boolean {
  const raw = process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

export function competitorIngestIncludeShipping(): boolean {
  const raw = process.env.COMPETITOR_INGEST_INCLUDE_SHIPPING?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

export function getCompetitorIngestStatus() {
  const driver = resolveCompetitorIngestDriver();
  const httpUrl = process.env.COMPETITOR_INGEST_HTTP_URL?.trim() || null;
  const listingPullUrl =
    process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim() || null;
  const compliantScrape = isCompetitorCompliantScrapeEnabled();
  return {
    driver,
    competitor_ingest_http_url_configured: Boolean(httpUrl),
    channel_listing_pull_url_configured: Boolean(listingPullUrl),
    include_shipping: competitorIngestIncludeShipping(),
    compliant_scrape_enabled: compliantScrape,
    ready:
      driver === "mock" ||
      driver === "channel" ||
      (driver === "http_stub" && Boolean(httpUrl || listingPullUrl)) ||
      (driver === "http_stub" && !httpUrl && !listingPullUrl),
    note:
      driver === "mock"
        ? "Mock ingest via in-process listing adapter."
        : driver === "channel"
          ? "Uses connected shop tokens + channel listing adapter (ML / Amazon)."
          : httpUrl
            ? "HTTP competitor ingest POST to COMPETITOR_INGEST_HTTP_URL."
            : listingPullUrl
              ? "http_stub falls back to CHANNEL_HTTP_LISTING_PULL_URL per offer."
              : "http_stub with no HTTP URLs — mock listing adapter fallback.",
  };
}

export class CompetitorScrapeComplianceError extends Error {
  constructor() {
    super("COMPETITOR_SCRAPE_COMPLIANCE_DISABLED");
    this.name = "CompetitorScrapeComplianceError";
  }
}

/** P2-E2-06: block unapproved scrape-style external refs unless feature flag is on. */
export function assertCompetitorScrapeAllowed(externalRef: string): void {
  if (!externalRef.trim().toUpperCase().startsWith("SCRAPE:")) {
    return;
  }
  if (!isCompetitorCompliantScrapeEnabled()) {
    throw new CompetitorScrapeComplianceError();
  }
}
