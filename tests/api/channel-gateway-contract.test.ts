import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HttpStubChannelPublishAdapter } from "@mx-pricing/channel-adapters";

/**
 * TC-INT-CH-GW-001 — validates BFF http_stub contract against sidecar-shaped HTTP.
 */
describe("channel gateway contract", () => {
  let baseUrl = "";
  let server: http.Server;

  beforeAll(async () => {
    server = http.createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/publish") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            publish_status: "published",
            channel_price_mxn: body.price_mxn,
            channel: body.channel,
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((e) => (e ? reject(e) : resolve()));
    });
  });

  it("HttpStubChannelPublishAdapter matches sidecar /publish", async () => {
    process.env.CHANNEL_HTTP_PUBLISH_URL = `${baseUrl}/publish`;
    const adapter = new HttpStubChannelPublishAdapter();
    const result = await adapter.publishPrice({
      shop: {
        shop_id: "shop-ml-demo",
        channel: "MERCADO_LIBRE",
        external_seller_id: "seller-1",
      },
      external_ref: "listing-ml-001",
      price_mxn: 1710,
    });
    expect(result.publish_status).toBe("published");
    expect(result.channel_price_mxn).toBe(1710);
    delete process.env.CHANNEL_HTTP_PUBLISH_URL;
  });
});
