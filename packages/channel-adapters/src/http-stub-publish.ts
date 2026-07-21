import type { ListingPublishAdapter, PublishPriceInput, PublishPriceResult } from "./publish-types.js";
import { MockChannelPublishAdapter } from "./mock-publish.js";
import { parsePublishHttpResponse } from "./http-response.js";

export class HttpStubChannelPublishAdapter implements ListingPublishAdapter {
  readonly fallback = new MockChannelPublishAdapter();

  lastHttpRequest?: { url: string; body: unknown };

  async publishPrice(input: PublishPriceInput): Promise<PublishPriceResult> {
    const url = process.env.CHANNEL_HTTP_PUBLISH_URL?.trim();
    if (!url) {
      return this.fallback.publishPrice(input);
    }
    const body = {
      channel: input.shop.channel,
      shop_id: input.shop.shop_id,
      external_ref: input.external_ref,
      price_mxn: input.price_mxn,
    };
    this.lastHttpRequest = { url, body };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return {
        publish_status: "failed",
        error_code: `HTTP_${res.status}`,
      };
    }
    const json: unknown = await res.json();
    const parsed = parsePublishHttpResponse(json);
    if (!parsed) {
      return {
        publish_status: "failed",
        error_code: "INVALID_HTTP_RESPONSE",
      };
    }
    return parsed;
  }
}
