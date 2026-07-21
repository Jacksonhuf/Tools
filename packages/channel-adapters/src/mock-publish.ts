import type { SalesChannel } from "./types.js";
import type {
  ListingPublishAdapter,
  PublishPriceInput,
  PublishPriceResult,
} from "./publish-types.js";

export class MockChannelPublishAdapter implements ListingPublishAdapter {
  /** Set to simulate publish failure (TC-INT-GUARD-004) */
  failNext = false;

  /** Channels that always reject until cleared (TC-INT-CH-006) */
  blockedChannels = new Set<SalesChannel>();

  async publishPrice(input: PublishPriceInput): Promise<PublishPriceResult> {
    if (this.failNext) {
      this.failNext = false;
      return {
        publish_status: "failed",
        error_code: "CHANNEL_REJECTED",
      };
    }
    if (this.blockedChannels.has(input.shop.channel)) {
      return {
        publish_status: "failed",
        error_code: "CHANNEL_REJECTED",
      };
    }
    if (input.price_mxn <= 0) {
      return {
        publish_status: "failed",
        error_code: "INVALID_PRICE_STEP",
      };
    }
    const channel = input.shop.channel;
    if (channel === "AMAZON_MX" && !Number.isInteger(input.price_mxn)) {
      return {
        publish_status: "failed",
        error_code: "INVALID_PRICE_STEP",
      };
    }
    if (
      channel === "MERCADO_LIBRE" &&
      Math.abs(input.price_mxn - Math.round(input.price_mxn * 100) / 100) > 1e-6
    ) {
      return {
        publish_status: "failed",
        error_code: "INVALID_PRICE_STEP",
      };
    }
    return {
      publish_status: "published",
      channel_price_mxn: input.price_mxn,
      channel,
    };
  }
}
