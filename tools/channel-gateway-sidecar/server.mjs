#!/usr/bin/env node
/**
 * Minimal channel gateway sidecar for local http_stub adapter (Loop 33).
 * Implements contract in docs/channel-http-adapters.md
 */
import http from "node:http";

const PORT = Number(process.env.CHANNEL_GATEWAY_PORT ?? 8787);

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    send(res, 200, { status: "ok", service: "channel-gateway-sidecar" });
    return;
  }
  if (req.method !== "POST") {
    send(res, 404, { error: "NOT_FOUND" });
    return;
  }
  try {
    const body = await readJson(req);
    if (req.url === "/publish") {
      const price = Number(body.price_mxn);
      if (!Number.isFinite(price) || price <= 0) {
        send(res, 200, {
          publish_status: "failed",
          error_code: "INVALID_PRICE_STEP",
        });
        return;
      }
      send(res, 200, {
        publish_status: "published",
        channel_price_mxn: price,
        channel: body.channel ?? "MERCADO_LIBRE",
      });
      return;
    }
    if (req.url === "/pull") {
      const ref = String(body.external_ref ?? "demo-ref");
      send(res, 200, {
        external_item_id: ref,
        price_mxn: 1599,
        currency: "MXN",
        synced_at: new Date().toISOString(),
      });
      return;
    }
    send(res, 404, { error: "NOT_FOUND" });
  } catch {
    send(res, 400, { error: "INVALID_JSON" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Channel gateway sidecar http://127.0.0.1:${PORT}`);
});
