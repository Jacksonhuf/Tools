import {
  HttpStubChannelListingAdapter,
  HttpStubChannelPublishAdapter,
  MockChannelListingAdapter,
  MockChannelPublishAdapter,
  type ListingPublishAdapter,
  type ListingPullAdapter,
} from "@mx-pricing/channel-adapters";

export type ChannelAdapterDriver = "mock" | "http_stub";

const DRIVER_ALIASES: Record<string, ChannelAdapterDriver> = {
  mock: "mock",
  http_stub: "http_stub",
  http: "http_stub",
};

export function resolveChannelAdapterDriver(
  raw?: string | null
): ChannelAdapterDriver {
  const key = (raw ?? process.env.CHANNEL_ADAPTER_DRIVER ?? "mock")
    .trim()
    .toLowerCase();
  return DRIVER_ALIASES[key] ?? "mock";
}

export function getChannelAdapterStatus() {
  const driver = resolveChannelAdapterDriver();
  const publishUrl = process.env.CHANNEL_HTTP_PUBLISH_URL?.trim() || null;
  const pullUrl = process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim() || null;
  const httpConfigured = Boolean(publishUrl || pullUrl);
  return {
    driver,
    publish_http_url_configured: Boolean(publishUrl),
    listing_pull_http_url_configured: Boolean(pullUrl),
    channel_live_acknowledged:
      process.env.CHANNEL_LIVE_ACKNOWLEDGED === "1" ||
      process.env.CHANNEL_LIVE_ACKNOWLEDGED === "true",
    ready:
      driver === "mock" ||
      (driver === "http_stub" && httpConfigured) ||
      (driver === "http_stub" && !httpConfigured),
    note:
      driver === "mock"
        ? "In-process mock adapters (default for local/CI)."
        : httpConfigured
          ? "HTTP stub adapters POST to CHANNEL_HTTP_* URLs; missing URL falls back to mock per operation."
          : "http_stub driver with no CHANNEL_HTTP_* URLs — publish/pull use mock fallback.",
  };
}

export function createChannelPublishAdapter(): ListingPublishAdapter {
  if (resolveChannelAdapterDriver() === "http_stub") {
    return new HttpStubChannelPublishAdapter();
  }
  return new MockChannelPublishAdapter();
}

export function createChannelListingAdapter(): ListingPullAdapter {
  if (resolveChannelAdapterDriver() === "http_stub") {
    return new HttpStubChannelListingAdapter();
  }
  return new MockChannelListingAdapter();
}
