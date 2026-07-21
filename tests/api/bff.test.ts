import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

function testApp() {
  const { app, catalog, adjustments } = createTestApp();
  catalog.resetForTests?.();
  adjustments.resetForTests?.();
  return { app, catalog, adjustments };
}

describe("TC-API-AUTH-001", () => {
  it("returns 401 without token", async () => {
    const { app } = testApp();
    const res = await app.request("/api/v1/skus/demo-sku-001/pricing-context");
    expect(res.status).toBe(401);
  });
});

describe("TC-API-AUTH-002 tenant isolation", () => {
  it("returns 404 for wrong tenant", async () => {
    const { app } = testApp();
    const res = await app.request("/api/v1/skus/demo-sku-001/pricing-context", {
      headers: {
        ...AUTH,
        "X-Tenant-Id": "other-tenant",
      },
    });
    expect(res.status).toBe(404);
  });
});

describe("TC-API-VER-004 pricing-context", () => {
  it("returns active and formatted amounts", async () => {
    const { app } = testApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/pricing-context?channel=MERCADO_LIBRE",
      { headers: { ...AUTH, ...TENANT, "Accept-Language": "es-MX" } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      sku: { formatted: string };
      floors: { mercado_libre: { formatted: string } };
      versions: { active: { publish_price: { formatted: string } } };
    };
    expect(json.sku.formatted).toBeDefined();
    expect(json.floors.mercado_libre.formatted).toMatch(/MXN|\$/);
    expect(json.versions.active.publish_price.formatted).toBeDefined();
  });
});

describe("TC-API-VER-005 simulate does not persist", () => {
  it("POST simulate twice without new version rows", async () => {
    const { app, catalog } = testApp();
    const body = JSON.stringify({
      channel: "MERCADO_LIBRE",
      pricing_mode: "cost",
      target_margin_pct: 20,
    });
    const headers = {
      ...AUTH,
      ...TENANT,
      "Content-Type": "application/json",
    };
    await app.request("/api/v1/skus/demo-sku-001/pricing/simulate", {
      method: "POST",
      headers,
      body,
    });
    await app.request("/api/v1/skus/demo-sku-001/pricing/simulate", {
      method: "POST",
      headers,
      body,
    });
    expect(await catalog.countVersions()).toBe(0);
  });
});

describe("TC-API-ADJ-003 price-versions publish", () => {
  it("creates active version when guards pass", async () => {
    const { app, catalog } = testApp();
    const res = await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: { ...AUTH, ...TENANT, "Content-Type": "application/json" },
      body: JSON.stringify({
        explicit_price_mxn: 1600,
        reason: "manual",
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { version_id: string; state: string };
    expect(json.state).toBe("active");
    expect(json.version_id).toMatch(/^ver-/);
    expect(await catalog.countVersions()).toBe(1);
  });

  it("rejects price below min margin", async () => {
    const { app } = testApp();
    const res = await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: { ...AUTH, ...TENANT, "Content-Type": "application/json" },
      body: JSON.stringify({ explicit_price_mxn: 1100 }),
    });
    expect(res.status).toBe(422);
  });
});

describe("simulate guard on low margin", () => {
  it("returns BELOW_MIN_MARGIN when target margin under policy", async () => {
    const { app } = testApp();
    const res = await app.request("/api/v1/skus/demo-sku-001/pricing/simulate", {
      method: "POST",
      headers: { ...AUTH, ...TENANT, "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "MERCADO_LIBRE",
        pricing_mode: "cost",
        target_margin_pct: 5,
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { guards: string[] };
    expect(json.guards).toContain("BELOW_MIN_MARGIN");
  });
});
