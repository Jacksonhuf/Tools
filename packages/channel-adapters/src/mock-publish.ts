import type {
  ListingPublishAdapter,
  PublishPriceInput,
  PublishPriceResult,
} from "./publish-types.js";

export class MockChannelPublishAdapter implements ListingPublishAdapter {
  /** Set to simulate publish failure (TC-INT-GUARD-004) */
  failNext = false;

  async publishPrice(input: PublishPriceInput): Promise<PublishPriceResult> {
    if (this.failNext) {
      this.failNext = false;
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
    return {
      publish_status: "published",
      channel_price_mxn: input.price_mxn,
    };
  }
}
