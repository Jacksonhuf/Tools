import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

async function seedActivePrice(
  app: ReturnType<typeof createTestApp>["app"],
  price: number
) {
  await app.request("/api/v1/listings/listing-ml-001/price-versions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ explicit_price_mxn: price }),
  });
}

describe("TC-API-ADJ-001 adjustment batch draft", () => {
  beforeEach(() => {
    const t = createTestApp();
    t.catalog.resetForTests?.();
    t.adjustments.resetForTests?.();
  });

  it("creates draft batch with valid item", async () => {
    const { app, catalog, adjustments } = createTestApp();
    catalog.resetForTests?.();
    adjustments.resetForTests?.();
    await seedActivePrice(app, 1600);
    const res = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason_code: "promo",
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1550 }],
      }),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { status: string; id: string };
    expect(json.status).toBe("draft");
    expect(json.id).toMatch(/^adj-/);
  });
});

describe("TC-API-ADJ-002 approval threshold", () => {
  it("blocks apply when drop exceeds 5% without approve", async () => {
    const { app, catalog, adjustments } = createTestApp();
    catalog.resetForTests?.();
    adjustments.resetForTests?.();
    await seedActivePrice(app, 1600);
    const createRes = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1510 }],
      }),
    });
    const batch = (await createRes.json()) as { id: string; status: string };
    expect(batch.status).toBe("pending_approval");
    const applyRes = await app.request(
      `/api/v1/adjustment-batches/${batch.id}/apply`,
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(applyRes.status).toBe(422);
  });
});

describe("TC-API-ADJ-003 approve and apply", () => {
  it("creates active versions after approve", async () => {
    const { app, catalog, adjustments } = createTestApp();
    catalog.resetForTests?.();
    adjustments.resetForTests?.();
    await seedActivePrice(app, 1600);
    const createRes = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1510 }],
      }),
    });
    const batch = (await createRes.json()) as { id: string };
    await app.request(`/api/v1/adjustment-batches/${batch.id}/approve`, {
      method: "POST",
      headers: JSON_HEADERS,
    });
    const applyRes = await app.request(
      `/api/v1/adjustment-batches/${batch.id}/apply`,
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(applyRes.status).toBe(200);
    const applied = (await applyRes.json()) as {
      batch: { status: string };
      version_ids: string[];
    };
    expect(applied.batch.status).toBe("applied");
    expect(applied.version_ids.length).toBe(1);
    expect(await catalog.countVersions()).toBe(2);
  });
});
