import { describe, expect, it } from "vitest";
import {
  MercadoLibreListingAdapter,
  MercadoLibrePublishAdapter,
} from "../../packages/channel-adapters/src/mercadolibre-adapter.js";

describe("MercadoLibre adapters", () => {
  it("pullListing requires access_token", async () => {
    const adapter = new MercadoLibreListingAdapter();
    await expect(
      adapter.pullListing(
        {
          shop_id: "s1",
          channel: "MERCADO_LIBRE",
          external_seller_id: "123",
        },
        "MLM123"
      )
    ).rejects.toThrow("CHANNEL_AUTH_REQUIRED");
  });

  it("publishPrice validates ML price step on 400", async () => {
    const adapter = new MercadoLibrePublishAdapter();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("invalid price", { status: 400 });
    try {
      const result = await adapter.publishPrice({
        shop: {
          shop_id: "s1",
          channel: "MERCADO_LIBRE",
          external_seller_id: "123",
          access_token: "tok",
        },
        external_ref: "MLM123",
        price_mxn: 99.99,
      });
      expect(result.publish_status).toBe("failed");
      expect(result.error_code).toBe("INVALID_PRICE_STEP");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
