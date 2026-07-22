import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("SKU catalog CSV (Loop 122)", () => {
  it("GET /skus/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("demo-sku-001");
  });
});

describe("shops CSV (Loop 123)", () => {
  it("GET /shops/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/shops/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("shop_id");
  });
});

describe("category rule templates CSV (Loop 124)", () => {
  it("GET /category-rule-templates/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/category-rule-templates/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("cat-electronics-mx");
  });
});

describe("export store kinds (Loop 122-124)", () => {
  it("POST /exports skus_catalog_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "skus_catalog_csv" }),
    });
    expect(post.status).toBe(200);
  });
});
