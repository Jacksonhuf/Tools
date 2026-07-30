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
import { isStagingOrProduction } from "./deploy-environment.js";

export type ChannelAdapterDriver =
  | "mock"
  | "http_stub"
  | "mercadolibre"
  | "amazon_sp_api"
  | "live"
  | "auto";

const DRIVER_ALIASES: Record<string, ChannelAdapterDriver> = {
  mock: "mock",
  http_stub: "http_stub",
  http: "http_stub",
  mercadolibre: "mercadolibre",
  ml: "mercadolibre",
  amazon_sp_api: "amazon_sp_api",
  amazon: "amazon_sp_api",
  live: "live",
  auto: "auto",
};

export function isChannelLivePublishArmed(): boolean {
  return (
    process.env.CHANNEL_LIVE_ACKNOWLEDGED === "1" ||
    process.env.CHANNEL_LIVE_ACKNOWLEDGED === "true"
  );
}

function defaultChannelAdapterDriver(): ChannelAdapterDriver {
  if (isStagingOrProduction() && isChannelLivePublishArmed()) {
    return "auto";
  }
  return "mock";
}

export function resolveChannelAdapterDriver(
  raw?: string | null
): ChannelAdapterDriver {
  const key = (raw ?? process.env.CHANNEL_ADAPTER_DRIVER ?? "")
    .trim()
    .toLowerCase();
  if (key && DRIVER_ALIASES[key]) {
    return DRIVER_ALIASES[key];
  }
  return defaultChannelAdapterDriver();
}

export function getChannelAdapterStatus() {
  const driver = resolveChannelAdapterDriver();
  const publishUrl = process.env.CHANNEL_HTTP_PUBLISH_URL?.trim() || null;
  const pullUrl = process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim() || null;
  const httpConfigured = Boolean(publishUrl || pullUrl);
  const liveAck = isChannelLivePublishArmed();
  const deployAuto =
    isStagingOrProduction() && liveAck && !process.env.CHANNEL_ADAPTER_DRIVER?.trim();
  return {
    driver,
    publish_http_url_configured: Boolean(publishUrl),
    listing_pull_http_url_configured: Boolean(pullUrl),
    channel_live_acknowledged: liveAck,
    live_publish_armed: liveAck,
    deploy_env_auto_driver: deployAuto,
    mercadolibre_configured: Boolean(process.env.ML_CLIENT_ID?.trim()),
    amazon_sp_api_configured: Boolean(process.env.AMAZON_LWA_APP_ID?.trim()),
    ready:
      driver === "mock" ||
      driver === "auto" ||
      driver === "mercadolibre" ||
      driver === "amazon_sp_api" ||
      driver === "live" ||
      (driver === "http_stub" && httpConfigured) ||
      (driver === "http_stub" && !httpConfigured),
    note:
      driver === "mock"
        ? "In-process mock adapters (default for local/CI)."
        : driver === "auto"
          ? liveAck
            ? "Auto: live ML/Amazon publish when shop token present; else HTTP stub or mock."
            : "Auto driver selected but CHANNEL_LIVE_ACKNOWLEDGED is off — falls back to HTTP/mock."
          : driver === "mercadolibre" ||
              driver === "amazon_sp_api" ||
              driver === "live"
            ? "Live channel API adapters (requires shop access_token)."
            : httpConfigured
              ? "HTTP stub adapters POST to CHANNEL_HTTP_* URLs; missing URL falls back to mock per operation."
              : "http_stub driver with no CHANNEL_HTTP_* URLs — publish/pull use mock fallback.",
  };
}

class AutoChannelPublishAdapter implements ListingPublishAdapter {
  private readonly ml = new MercadoLibrePublishAdapter();
  private readonly amz = new AmazonMxPublishAdapter();
  private readonly http = new HttpStubChannelPublishAdapter();
  private readonly mock = new MockChannelPublishAdapter();

  async publishPrice(
    input: Parameters<ListingPublishAdapter["publishPrice"]>[0]
  ) {
    if (isChannelLivePublishArmed() && input.shop.access_token?.trim()) {
      if (input.shop.channel === "MERCADO_LIBRE") {
        return this.ml.publishPrice(input);
      }
      if (input.shop.channel === "AMAZON_MX") {
        return this.amz.publishPrice(input);
      }
    }
    if (process.env.CHANNEL_HTTP_PUBLISH_URL?.trim()) {
      return this.http.publishPrice(input);
    }
    return this.mock.publishPrice(input);
  }
}

class LiveChannelPublishAdapter implements ListingPublishAdapter {
  private readonly auto = new AutoChannelPublishAdapter();

  async publishPrice(
    input: Parameters<ListingPublishAdapter["publishPrice"]>[0]
  ) {
    if (!isChannelLivePublishArmed()) {
      return new MockChannelPublishAdapter().publishPrice(input);
    }
    return this.auto.publishPrice(input);
  }
}

class AutoChannelListingAdapter implements ListingPullAdapter {
  private readonly ml = new MercadoLibreListingAdapter();
  private readonly amz = new AmazonMxListingAdapter();
  private readonly http = new HttpStubChannelListingAdapter();
  private readonly mock = new MockChannelListingAdapter();

  async pullListing(
    shop: Parameters<ListingPullAdapter["pullListing"]>[0],
    externalRef: string
  ) {
    if (isChannelLivePublishArmed() && shop.access_token?.trim()) {
      if (shop.channel === "MERCADO_LIBRE") {
        return this.ml.pullListing(shop, externalRef);
      }
      if (shop.channel === "AMAZON_MX") {
        return this.amz.pullListing(shop, externalRef);
      }
    }
    if (process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim()) {
      return this.http.pullListing(shop, externalRef);
    }
    return this.mock.pullListing(shop, externalRef);
  }
}

class LiveChannelListingAdapter implements ListingPullAdapter {
  private readonly auto = new AutoChannelListingAdapter();

  async pullListing(
    shop: Parameters<ListingPullAdapter["pullListing"]>[0],
    externalRef: string
  ) {
    if (!isChannelLivePublishArmed()) {
      return new MockChannelListingAdapter().pullListing(shop, externalRef);
    }
    return this.auto.pullListing(shop, externalRef);
  }
}

export function createChannelPublishAdapter(): ListingPublishAdapter {
  const driver = resolveChannelAdapterDriver();
  if (driver === "mercadolibre") return new MercadoLibrePublishAdapter();
  if (driver === "amazon_sp_api") return new AmazonMxPublishAdapter();
  if (driver === "live") return new LiveChannelPublishAdapter();
  if (driver === "auto") return new AutoChannelPublishAdapter();
  if (driver === "http_stub") return new HttpStubChannelPublishAdapter();
  return new MockChannelPublishAdapter();
}

export function createChannelListingAdapter(): ListingPullAdapter {
  const driver = resolveChannelAdapterDriver();
  if (driver === "mercadolibre") return new MercadoLibreListingAdapter();
  if (driver === "amazon_sp_api") return new AmazonMxListingAdapter();
  if (driver === "live") return new LiveChannelListingAdapter();
  if (driver === "auto") return new AutoChannelListingAdapter();
  if (driver === "http_stub") return new HttpStubChannelListingAdapter();
  return new MockChannelListingAdapter();
}
