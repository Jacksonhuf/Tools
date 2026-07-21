import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

async function seedEvent(app: ReturnType<typeof createTestApp>["app"]) {
  const create = await app.request(
    "/api/v1/listings/listing-ml-001/competitors",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM-GUARD" }),
    }
  );
  const offer = (await create.json()) as { id: string };
  await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      sale_price: 1400,
      observed_at: new Date().toISOString(),
    }),
  });
  await app.request(
    "/api/v1/listings/listing-ml-001/repricing-events/flush",
    { method: "POST", headers: JSON_HEADERS }
  );
  const list = await app.request(
    "/api/v1/listings/listing-ml-001/repricing-events",
    { headers: { ...AUTH, ...TENANT } }
  );
  const { items } = (await list.json()) as { items: Array<{ id: string }> };
  return items[0].id;
}

describe("TC-INT-GUARD-001 cooldown", () => {
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

  it("rejects process while cooldown active", async () => {
    const { app, repricingActivity } = createTestApp();
    await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ cooldown_min: 120 }),
      }
    );
    await repricingActivity.recordApply("listing-ml-001");
    const eventId = await seedEvent(app);
    const proc = await app.request(
      `/api/v1/repricing-events/${eventId}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { reason: string };
    expect(result.reason).toBe("COOLDOWN_ACTIVE");
  });
});

describe("TC-INT-GUARD-002 daily limit", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.repricingActivity.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("blocks fourth apply in UTC day", async () => {
    const { app, repricingActivity } = createTestApp();
    await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ daily_limit: 3, cooldown_min: 0 }),
      }
    );
    const now = new Date().toISOString();
    await repricingActivity.recordApply("listing-ml-001", now);
    await repricingActivity.recordApply("listing-ml-001", now);
    await repricingActivity.recordApply("listing-ml-001", now);
    const eventId = await seedEvent(app);
    const proc = await app.request(
      `/api/v1/repricing-events/${eventId}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { reason: string };
    expect(result.reason).toBe("DAILY_LIMIT_EXCEEDED");
  });
});

describe("TC-INT-GUARD-004 publish failure freezes rule", () => {
  it("sets rule.frozen on channel publish fail", async () => {
    const { app, publishAdapter } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    publishAdapter.failNext = true;
    const pub = await app.request(
      "/api/v1/listings/listing-ml-001/channel-publish",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ explicit_price_mxn: 1500 }),
      }
    );
    expect(pub.status).toBe(422);
    const rule = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      { headers: { ...AUTH, ...TENANT } }
    );
    const body = (await rule.json()) as { rule: { frozen: boolean } };
    expect(body.rule.frozen).toBe(true);
  });
});
