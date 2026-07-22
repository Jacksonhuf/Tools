import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

function recentIso(minutesAgo = 1): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

async function seedOffer(app: ReturnType<typeof createTestApp>["app"]) {
  const create = await app.request(
    "/api/v1/listings/listing-ml-001/competitors",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM-EVT" }),
    }
  );
  return (await create.json()) as { id: string };
}

async function addObs(
  app: ReturnType<typeof createTestApp>["app"],
  offerId: string,
  sale_price: number,
  observed_at: string
) {
  await app.request(`/api/v1/competitor-offers/${offerId}/observations`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ sale_price, observed_at }),
  });
}

describe("TC-INT-EVT-001 CompetitorPriceChanged enqueue", () => {
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

  it("flushes debounced change into repricing event", async () => {
    const { app } = createTestApp();
    const offer = await seedOffer(app);
    await addObs(app, offer.id, 1500, recentIso(3));
    await addObs(app, offer.id, 1400, recentIso(2));
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const flushed = (await flush.json()) as {
      event: { type: string; payload: { current_effective: number } };
    };
    expect(flushed.event.type).toBe("CompetitorPriceChanged");
    expect(flushed.event.payload.current_effective).toBe(1400);
  });
});

describe("TC-INT-EVT-002 debounce merges ticks", () => {
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

  it("records 10 ticks but one event on flush", async () => {
    const { app } = createTestApp();
    const offer = await seedOffer(app);
    for (let i = 0; i < 10; i++) {
      await addObs(
        app,
        offer.id,
        1500 - i,
        recentIso(10 - i)
      );
    }
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const flushed = (await flush.json()) as {
      event: { payload: { debounce_ticks: number; current_effective: number } };
    };
    expect(flushed.event.payload.debounce_ticks).toBe(10);
    expect(flushed.event.payload.current_effective).toBe(1491);
    const list = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events",
      { headers: { ...AUTH, ...TENANT } }
    );
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(1);
  });
});

describe("TC-INT-EVT-003 suggested version on process", () => {
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

  it("creates suggested without superseding active", async () => {
    const { app, catalog } = createTestApp();
    resetDebounceForTests();
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1600 }),
    });
    const offer = await seedOffer(app);
    await addObs(app, offer.id, 1400, recentIso(1));
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const { event } = (await flush.json()) as { event: { id: string } };
    const process = await app.request(
      `/api/v1/repricing-events/${event.id}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const result = (await process.json()) as { state: string };
    expect(result.state).toBe("suggested");
    const versions = await catalog.listVersions("demo-sku-001");
    const active = versions.filter(
      (v) => v.state === "active" && v.channel === "MERCADO_LIBRE"
    );
    expect(active.length).toBe(1);
    expect(active[0].publish_price_mxn).toBe(1600);
  });
});

describe("TC-INT-EVT-004 process idempotency", () => {
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

  it("second process does not add version", async () => {
    const { app, catalog } = createTestApp();
    resetDebounceForTests();
    const offer = await seedOffer(app);
    await addObs(app, offer.id, 1300, recentIso(1));
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const { event } = (await flush.json()) as { event: { id: string } };
    await app.request(`/api/v1/repricing-events/${event.id}/process`, {
      method: "POST",
      headers: JSON_HEADERS,
    });
    const before = await catalog.countVersions();
    const again = await app.request(
      `/api/v1/repricing-events/${event.id}/process`,
      { method: "POST", headers: JSON_HEADERS }
    );
    const skipped = (await again.json()) as { skipped: boolean };
    expect(skipped.skipped).toBe(true);
    expect(await catalog.countVersions()).toBe(before);
  });
});

describe("TC-INT-ING-005 ingest run updates schedule", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
  });

  it("returns tier and creates observation via mock ingest", async () => {
    const { app, competitors } = createTestApp();
    await seedOffer(app);
    const run = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/run",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(run.status).toBe(200);
    const body = (await run.json()) as {
      tier: string;
      observations_created: number;
    };
    expect(body.tier).toBe("T1");
    expect(body.observations_created).toBeGreaterThanOrEqual(1);
    const status = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/status",
      { headers: { ...AUTH, ...TENANT } }
    );
    const st = (await status.json()) as { interval_ms: number };
    expect(st.interval_ms).toBe(60 * 60 * 1000);
  });
});
