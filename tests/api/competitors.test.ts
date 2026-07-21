import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { computeEffectivePrice } from "../../apps/bff/src/competitor-normalize.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-UNIT-ING-003 effective price normalization", () => {
  it("adds shipping when include_shipping is true", () => {
    expect(
      computeEffectivePrice({
        sale_price: 400,
        shipping_addon: 49,
        include_shipping: true,
      })
    ).toBe(449);
    expect(
      computeEffectivePrice({
        sale_price: 400,
        shipping_addon: 49,
        include_shipping: false,
      })
    ).toBe(400);
  });
});

describe("TC-API-COMP-001 competitor offer CRUD", () => {
  it("creates offer and lists with anchor median", async () => {
    const { app, competitors } = createTestApp();
    competitors.resetForTests?.();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          external_ref: "MLM999",
          label: "Rival A",
          is_primary: true,
        }),
      }
    );
    expect(create.status).toBe(201);
    const offer = (await create.json()) as { id: string };
    await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          sale_price: 100,
          observed_at: "2026-07-20T10:00:00.000Z",
          source: "manual",
        }),
      }
    );
    await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          sale_price: 200,
          shipping_addon: 10,
          include_shipping: true,
          observed_at: "2026-07-21T10:00:00.000Z",
          source: "manual",
        }),
      }
    );
    const list = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      { headers: { ...AUTH, ...TENANT } }
    );
    const json = (await list.json()) as {
      anchor: { median_mxn: number };
      items: Array<{ latest_effective_mxn: number }>;
    };
    expect(json.items.length).toBe(1);
    expect(json.items[0].latest_effective_mxn).toBe(210);
    expect(json.anchor.median_mxn).toBe(210);
  });
});

describe("TC-API-COMP-002 price history", () => {
  it("returns observations in range", async () => {
    const { app, competitors } = createTestApp();
    competitors.resetForTests?.();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM1" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sale_price: 1500 }),
      }
    );
    const hist = await app.request(
      "/api/v1/listings/listing-ml-001/price-history?range=7d",
      { headers: { ...AUTH, ...TENANT } }
    );
    const data = (await hist.json()) as { observations: unknown[] };
    expect(data.observations.length).toBe(1);
  });
});

describe("TC-API-COMP-003 pricing-context competitor summary", () => {
  it("includes anchor when offers exist", async () => {
    const { app, competitors } = createTestApp();
    competitors.resetForTests?.();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-CTX" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sale_price: 1400 }),
      }
    );
    const ctx = await app.request(
      "/api/v1/skus/demo-sku-001/pricing-context?channel=MERCADO_LIBRE",
      { headers: { ...AUTH, ...TENANT } }
    );
    const body = (await ctx.json()) as {
      competitors?: { anchor: { median_mxn: number } };
    };
    expect(body.competitors?.anchor.median_mxn).toBe(1400);
  });
});
