import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("price version CSV (Loop 166)", () => {
  it("GET /price-versions/:versionId/export", async () => {
    const { app } = createTestApp();
    const pub = await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1700 }),
    });
    expect(pub.status).toBe(200);
    const { version_id } = (await pub.json()) as { version_id: string };
    const res = await app.request(
      `/api/v1/price-versions/${version_id}/export`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("publish_price_mxn");
  });
});

describe("version backup rows CSV (Loop 167)", () => {
  it("GET /ops/version-backup/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/version-backup/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("version_count");
  });
});

describe("P5 readiness CSV (Loop 168)", () => {
  it("GET /product/readiness/p5/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/product/readiness/p5/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("P5-01");
  });
});

describe("shop CSV (Loop 169)", () => {
  it("GET /shops/:shopId/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/shops/shop-ml-demo/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("shop_id");
  });
});

describe("export store kinds (Loop 166-169)", () => {
  it("POST /exports price_version_csv", async () => {
    const { app } = createTestApp();
    const pub = await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1710 }),
    });
    const { version_id } = (await pub.json()) as { version_id: string };
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "price_version_csv", version_id }),
    });
    expect(post.status).toBe(200);
  });
});
