import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";
import {
  isWithinMexicoBusinessHours,
  setMexicoBusinessHoursClockForTests,
} from "../../apps/bff/src/repricing/business-hours.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("Mexico business hours helper", () => {
  it("detects Sunday night as outside default window", () => {
    setMexicoBusinessHoursClockForTests(
      new Date("2026-07-19T15:00:00.000Z")
    );
    expect(isWithinMexicoBusinessHours()).toBe(false);
    setMexicoBusinessHoursClockForTests(null);
  });
});

describe("P3-E1-02 business_hours_only guard", () => {
  beforeEach(() => {
    resetDebounceForTests();
    setMexicoBusinessHoursClockForTests(
      new Date("2026-07-19T15:00:00.000Z")
    );
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  afterEach(() => {
    setMexicoBusinessHoursClockForTests(null);
  });

  it("skips repricing process outside Mexico business hours", async () => {
    const { app, catalog } = createTestApp();
    await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          business_hours_only: true,
          min_gap_mxn: 0,
        }),
      }
    );
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-BH" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1410 }),
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
    const before = await catalog.countVersions();
    const proc = await app.request(
      `/api/v1/repricing-events/${items[0].id}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { skipped: boolean; reason: string };
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("OUTSIDE_BUSINESS_HOURS");
    expect(await catalog.countVersions()).toBe(before);
  });
});
