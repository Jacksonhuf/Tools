import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

function recentIso(minutesAgo = 1): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

describe("P2-E3-06 pricing-context suggested vs active", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.repricingActivity.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("returns suggested version alongside active in pricing-context", async () => {
    const { app } = createTestApp();
    resetDebounceForTests();

    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1600 }),
    });

    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-SUG" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1400, observed_at: recentIso(1) }),
    });

    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const { event } = (await flush.json()) as { event: { id: string } };
    await app.request(`/api/v1/repricing-events/${event.id}/process`, {
      method: "POST",
      headers: JSON_HEADERS,
    });

    const res = await app.request(
      "/api/v1/skus/demo-sku-001/pricing-context?channel=MERCADO_LIBRE",
      { headers: { ...AUTH, ...TENANT, "Accept-Language": "en" } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      versions: {
        active: { publish_price_mxn: number; publish_price: { formatted: string } };
        suggested: {
          version_id: string;
          publish_price_mxn: number;
          publish_price: { formatted: string };
        } | null;
      };
    };
    expect(json.versions.active.publish_price_mxn).toBe(1600);
    expect(json.versions.suggested).not.toBeNull();
    expect(json.versions.suggested!.publish_price_mxn).not.toBe(1600);
    expect(json.versions.suggested!.publish_price.formatted).toMatch(/MXN|\$/);
  });
});
