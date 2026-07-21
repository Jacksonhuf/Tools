import { describe, expect, it, vi, afterEach } from "vitest";
import { HttpStubChannelPublishAdapter } from "@mx-pricing/channel-adapters";

describe("HttpStubChannelPublishAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CHANNEL_HTTP_PUBLISH_URL;
  });

  it("TC-API-CH-HTTP-001 POSTs to CHANNEL_HTTP_PUBLISH_URL and parses response", async () => {
    process.env.CHANNEL_HTTP_PUBLISH_URL = "https://channel-stub.example/publish";
    const fetchMock = vi.fn(async () =>
      Response.json({
        publish_status: "published",
        channel_price_mxn: 1725,
        channel: "MERCADO_LIBRE",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new HttpStubChannelPublishAdapter();
    const result = await adapter.publishPrice({
      shop: {
        shop_id: "shop-ml-demo",
        channel: "MERCADO_LIBRE",
        external_seller_id: "seller-1",
      },
      external_ref: "MLM999",
      price_mxn: 1725,
    });

    expect(result.publish_status).toBe("published");
    expect(result.channel_price_mxn).toBe(1725);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      channel: "MERCADO_LIBRE",
      price_mxn: 1725,
    });
  });

  it("falls back to mock when URL is not set", async () => {
    const adapter = new HttpStubChannelPublishAdapter();
    const result = await adapter.publishPrice({
      shop: {
        shop_id: "shop-ml-demo",
        channel: "MERCADO_LIBRE",
        external_seller_id: "seller-1",
      },
      external_ref: "MLM999",
      price_mxn: 1600,
    });
    expect(result.publish_status).toBe("published");
  });
});
