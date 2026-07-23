import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
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
      body: JSON.stringify({ external_ref: "MLM-LOOP190" }),
    }
  );
  return (await create.json()) as { id: string };
}

describe("price observation row CSV (Loop 190)", () => {
  it("GET /price-observations/:observationId/export", async () => {
    const { app, competitors } = createTestApp();
    competitors.resetForTests?.();
    const offer = await seedOffer(app);
    const obsRes = await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sale_price: 1400, shipping_addon: 0 }),
      }
    );
    const observation = (await obsRes.json()) as { id: string };
    const res = await app.request(
      `/api/v1/price-observations/${observation.id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(observation.id);
  });
});

describe("repricing event row CSV (Loop 191)", () => {
  beforeEach(() => {
    resetDebounceForTests();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
  });

  it("GET /repricing-events/:eventId/export", async () => {
    const { app } = createTestApp();
    const offer = await seedOffer(app);
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1500, observed_at: recentIso(3) }),
    });
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1400, observed_at: recentIso(2) }),
    });
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const flushed = (await flush.json()) as { event: { id: string } };
    const res = await app.request(
      `/api/v1/repricing-events/${flushed.event.id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(flushed.event.id);
  });
});

describe("adjustment batch index row CSV (Loop 192)", () => {
  it("GET /adjustment-batches/:batchId/index/export", async () => {
    const { app } = createTestApp();
    const created = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason_code: "loop192",
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1599 }],
      }),
    });
    const batch = (await created.json()) as { id: string };
    const res = await app.request(
      `/api/v1/adjustment-batches/${batch.id}/index/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(batch.id);
  });
});

describe("agent digest date path CSV (Loop 193)", () => {
  it("GET /agent/digest/daily/:date/export", async () => {
    const { app } = createTestApp();
    const meta = await app.request("/api/v1/agent/digest/daily", {
      headers: { ...AUTH, ...TENANT, "Accept-Language": "en" },
    });
    const { date } = (await meta.json()) as { date: string };
    const res = await app.request(
      `/api/v1/agent/digest/daily/${date}/export`,
      { headers: { ...AUTH, ...TENANT, "Accept-Language": "en" } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(date);
  });
});

describe("export store kinds (Loop 190-193)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports price_observation_csv", async () => {
    const { app, competitors } = createTestApp();
    competitors.resetForTests?.();
    const offer = await seedOffer(app);
    const obsRes = await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sale_price: 1410 }),
      }
    );
    const observation = (await obsRes.json()) as { id: string };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "price_observation_csv",
        observation_id: observation.id,
      }),
    });
    expect(post.status).toBe(200);
  });
});
