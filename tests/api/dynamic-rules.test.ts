import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-P2-E3-03 dynamic rule CRUD", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
  });

  it("GET returns default rule and PUT updates anchor", async () => {
    const { app } = createTestApp();
    const get = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(get.status).toBe(200);
    const initial = (await get.json()) as {
      rule: { anchor_type: string; action: string };
    };
    expect(initial.rule.action).toBe("suggest");
    const put = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          anchor_type: "min",
          offset: { type: "PERCENT", value: -2 },
          min_gap_mxn: 10,
        }),
      }
    );
    const updated = (await put.json()) as { anchor_type: string };
    expect(updated.anchor_type).toBe("min");
  });
});

describe("TC-API-GUARD-005 unfreeze", () => {
  it("clears rule.frozen", async () => {
    const { app } = createTestApp();
    await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ frozen: true }),
      }
    );
    const unfreeze = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule/unfreeze",
      { method: "POST", headers: JSON_HEADERS }
    );
    const rule = (await unfreeze.json()) as { frozen: boolean };
    expect(rule.frozen).toBe(false);
  });
});

describe("TC-INT-ING-004 stale blocks suggest", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("process skips with STALE_COMPETITOR_DATA", async () => {
    const { app, catalog } = createTestApp();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-STALE" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        sale_price: 1200,
        observed_at: "2020-01-01T00:00:00.000Z",
      }),
    });
    const check = await app.request(
      "/api/v1/listings/listing-ml-001/competitors/stale-check",
      { method: "POST", headers: JSON_HEADERS }
    );
    const staleJson = (await check.json()) as { stale: boolean };
    expect(staleJson.stale).toBe(true);
    await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const list = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events",
      { headers: { ...AUTH, ...TENANT } }
    );
    const { items } = (await list.json()) as {
      items: Array<{ id: string }>;
    };
    expect(items.length).toBeGreaterThan(0);
    const before = await catalog.countVersions();
    const proc = await app.request(
      `/api/v1/repricing-events/${items[0].id}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { skipped: boolean; reason: string };
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("STALE_COMPETITOR_DATA");
    expect(await catalog.countVersions()).toBe(before);
  });
});
