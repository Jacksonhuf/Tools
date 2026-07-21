import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-NFR-REL-003 ingest failure does not lower active", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
    t.listingAdapter.failNextPull = false;
  });

  it("marks ingest failed and does not add observations when pull errors", async () => {
    const { app, listingAdapter } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/competitors", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM-INGEST-FAIL" }),
    });
    listingAdapter.failNextPull = true;
    const run = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/run",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(run.status).toBe(503);
    const status = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/status",
      { headers: { ...AUTH, ...TENANT } }
    );
    const body = (await status.json()) as { ingest_failed: boolean };
    expect(body.ingest_failed).toBe(true);
  });

  it("blocks auto_active downgrade while ingest_failed is set", async () => {
    const { app, catalog, listingHealth } = createTestApp();
    await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 2000,
    });
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-LOW" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1100 }),
    });
    await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: "auto_active",
          min_gap_mxn: 0,
          cooldown_min: 0,
        }),
      }
    );
    await listingHealth.setIngestFailed("listing-ml-001", true);
    await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const list = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events",
      { headers: { ...AUTH, ...TENANT } }
    );
    const { items } = (await list.json()) as { items: Array<{ id: string }> };
    const proc = await app.request(
      `/api/v1/repricing-events/${items[0].id}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { skipped: boolean; reason: string };
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("INGEST_FAILED_NO_DOWNGRADE");
    const versions = await catalog.listVersions("demo-sku-001");
    const active = versions.filter(
      (v) => v.state === "active" && v.channel === "MERCADO_LIBRE"
    );
    expect(active).toHaveLength(1);
    expect(active[0].publish_price_mxn).toBe(2000);
  });
});

describe("P3-E1-03 auto_pending action", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("creates pending version when action is auto_pending", async () => {
    const { app } = createTestApp();
    await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: "auto_pending", min_gap_mxn: 0 }),
      }
    );
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-PEND" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1450 }),
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
    const proc = await app.request(
      `/api/v1/repricing-events/${items[0].id}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await proc.json()) as { state: string };
    expect(result.state).toBe("pending");
  });
});
