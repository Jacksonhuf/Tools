import {
  AmazonMxListingAdapter,
  AmazonMxPublishAdapter,
  HttpStubChannelListingAdapter,
  HttpStubChannelPublishAdapter,
  MercadoLibreListingAdapter,
  MercadoLibrePublishAdapter,
  MockChannelListingAdapter,
  MockChannelPublishAdapter,
  type ListingPublishAdapter,
  type ListingPullAdapter,
} from "@mx-pricing/channel-adapters";

export type ChannelAdapterDriver =
  | "mock"
  | "http_stub"
  | "mercadolibre"
  | "amazon_sp_api"
  | "live";

const DRIVER_ALIASES: Record<string, ChannelAdapterDriver> = {
  mock: "mock",
  http_stub: "http_stub",
  http: "http_stub",
  mercadolibre: "mercadolibre",
  ml: "mercadolibre",
  amazon_sp_api: "amazon_sp_api",
  amazon: "amazon_sp_api",
  live: "live",
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
  const liveAck =
    process.env.CHANNEL_LIVE_ACKNOWLEDGED === "1" ||
    process.env.CHANNEL_LIVE_ACKNOWLEDGED === "true";
  return {
    driver,
    publish_http_url_configured: Boolean(publishUrl),
    listing_pull_http_url_configured: Boolean(pullUrl),
    channel_live_acknowledged: liveAck,
    mercadolibre_configured: Boolean(process.env.ML_CLIENT_ID?.trim()),
    amazon_sp_api_configured: Boolean(process.env.AMAZON_LWA_APP_ID?.trim()),
    ready:
      driver === "mock" ||
      driver === "mercadolibre" ||
      driver === "amazon_sp_api" ||
      driver === "live" ||
      (driver === "http_stub" && httpConfigured) ||
      (driver === "http_stub" && !httpConfigured),
    note:
      driver === "mock"
        ? "In-process mock adapters (default for local/CI)."
        : driver === "mercadolibre" || driver === "amazon_sp_api" || driver === "live"
          ? "Live channel API adapters (requires shop access_token)."
          : httpConfigured
            ? "HTTP stub adapters POST to CHANNEL_HTTP_* URLs; missing URL falls back to mock per operation."
            : "http_stub driver with no CHANNEL_HTTP_* URLs — publish/pull use mock fallback.",
  };
}

class LiveChannelPublishAdapter implements ListingPublishAdapter {
  private readonly ml = new MercadoLibrePublishAdapter();
  private readonly amz = new AmazonMxPublishAdapter();
  private readonly http = new HttpStubChannelPublishAdapter();
  private readonly mock = new MockChannelPublishAdapter();

  async publishPrice(
    input: Parameters<ListingPublishAdapter["publishPrice"]>[0]
  ) {
    if (!livePublishAllowed()) {
      return this.mock.publishPrice(input);
    }
    if (input.shop.channel === "MERCADO_LIBRE") {
      return this.ml.publishPrice(input);
    }
    if (input.shop.channel === "AMAZON_MX") {
      return this.amz.publishPrice(input);
    }
    return this.http.publishPrice(input);
  }
}

class LiveChannelListingAdapter implements ListingPullAdapter {
  private readonly ml = new MercadoLibreListingAdapter();
  private readonly amz = new AmazonMxListingAdapter();
  private readonly http = new HttpStubChannelListingAdapter();
  private readonly mock = new MockChannelListingAdapter();

  async pullListing(
    shop: Parameters<ListingPullAdapter["pullListing"]>[0],
    externalRef: string
  ) {
    if (!livePublishAllowed()) {
      return this.mock.pullListing(shop, externalRef);
    }
    if (shop.channel === "MERCADO_LIBRE") {
      return this.ml.pullListing(shop, externalRef);
    }
    if (shop.channel === "AMAZON_MX") {
      return this.amz.pullListing(shop, externalRef);
    }
    return this.http.pullListing(shop, externalRef);
  }
}

function livePublishAllowed(): boolean {
  return (
    process.env.CHANNEL_LIVE_ACKNOWLEDGED === "1" ||
    process.env.CHANNEL_LIVE_ACKNOWLEDGED === "true"
  );
}

export function createChannelPublishAdapter(): ListingPublishAdapter {
  const driver = resolveChannelAdapterDriver();
  if (driver === "mercadolibre") return new MercadoLibrePublishAdapter();
  if (driver === "amazon_sp_api") return new AmazonMxPublishAdapter();
  if (driver === "live") return new LiveChannelPublishAdapter();
  if (driver === "http_stub") return new HttpStubChannelPublishAdapter();
  return new MockChannelPublishAdapter();
}

export function createChannelListingAdapter(): ListingPullAdapter {
  const driver = resolveChannelAdapterDriver();
  if (driver === "mercadolibre") return new MercadoLibreListingAdapter();
  if (driver === "amazon_sp_api") return new AmazonMxListingAdapter();
  if (driver === "live") return new LiveChannelListingAdapter();
  if (driver === "http_stub") return new HttpStubChannelListingAdapter();
  return new MockChannelListingAdapter();
}
