import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-INT-VER-003 dynamic repricing audit fields", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("persists trigger_event_id and snapshot ids on event-driven version", async () => {
    const { app } = createTestApp();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-AUDIT" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    const obs = await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sale_price: 1420 }),
      }
    );
    const observation = (await obs.json()) as { id: string };
    await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const list = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events",
      { headers: { ...AUTH, ...TENANT } }
    );
    const { items } = (await list.json()) as { items: Array<{ id: string }> };
    const eventId = items[0].id;
    const proc = await app.request(
      `/api/v1/repricing-events/${eventId}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { version_id: string };
    const ver = await app.request(
      `/api/v1/price-versions/${result.version_id}`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(ver.status).toBe(200);
    const body = (await ver.json()) as {
      version: {
        trigger_event_id: string;
        dynamic_rule_id: string;
        competitor_snapshot_ids: string[];
        floor_snapshot_id: string;
        cost_snapshot_id: string;
      };
    };
    expect(body.version.trigger_event_id).toBe(eventId);
    expect(body.version.dynamic_rule_id).toMatch(/^drule-/);
    expect(body.version.competitor_snapshot_ids).toContain(observation.id);
    expect(body.version.floor_snapshot_id).toMatch(/^floor:listing-ml-001:/);
    expect(body.version.cost_snapshot_id).toMatch(/^cost:demo-sku-001:/);
  });
});
