import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-API-SHOP-001 list demo shops", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.shops.resetForTests?.();
  });

  it("returns ML and Amazon demo shops disconnected", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/shops", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      items: Array<{ id: string; channel: string; auth_status: string }>;
    };
    expect(json.items.length).toBeGreaterThanOrEqual(2);
    const ml = json.items.find((s) => s.channel === "MERCADO_LIBRE");
    expect(ml?.auth_status).toBe("disconnected");
  });
});

describe("TC-INT-CH-001 mock OAuth and pullListing (ML)", () => {
  it("connects shop and pulls listing snapshot", async () => {
    const { app } = createTestApp();
    const start = await app.request("/api/v1/shops/shop-ml-demo/oauth/start", {
      method: "POST",
      headers: JSON_HEADERS,
    });
    expect(start.status).toBe(200);
    const { state, authorization_url } = (await start.json()) as {
      state: string;
      authorization_url: string;
    };
    expect(authorization_url).toContain("mercadolibre");

    const complete = await app.request(
      "/api/v1/shops/shop-ml-demo/oauth/mock-complete",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ state }),
      }
    );
    expect(complete.status).toBe(200);
    const connected = (await complete.json()) as {
      auth_status: string;
      shop: { auth_status: string };
    };
    expect(connected.auth_status).toBe("connected");

    const pull = await app.request("/api/v1/shops/shop-ml-demo/listings/pull", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM123456" }),
    });
    expect(pull.status).toBe(200);
    const snap = (await pull.json()) as {
      snapshot: { price_mxn: number; external_item_id: string };
    };
    expect(snap.snapshot.external_item_id).toBe("MLM123456");
    expect(snap.snapshot.price_mxn).toBeGreaterThan(0);
  });
});

describe("TC-INT-CH-002 Amazon pullListing", () => {
  it("returns ASIN fields after mock connect", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-amz-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    const pull = await app.request(
      "/api/v1/shops/shop-amz-demo/listings/pull",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "B0TEST123" }),
      }
    );
    expect(pull.status).toBe(200);
    const snap = (await pull.json()) as {
      snapshot: { external_asin?: string; price_mxn: number };
    };
    expect(snap.snapshot.external_asin).toBe("B0TEST123");
    expect(snap.snapshot.price_mxn).toBe(1549);
  });
});

describe("TC-API-SHOP-002 pull without auth", () => {
  it("returns 401 AUTH_REQUIRED", async () => {
    const { app, shops } = createTestApp();
    shops.resetForTests?.();
    const res = await app.request("/api/v1/shops/shop-ml-demo/listings/pull", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "x" }),
    });
    expect(res.status).toBe(401);
  });
});
