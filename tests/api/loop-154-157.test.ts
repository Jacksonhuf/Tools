import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("pricing snapshot dedicated export (Loop 154)", () => {
  it("GET /reports/pricing-snapshot/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/reports/pricing-snapshot/export?sku_id=demo-sku-001",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("exported_at,sku_id,sku_code,channel");
  });
});

describe("cross-channel guard CSV (Loop 155)", () => {
  it("GET /skus/:skuId/cross-channel-guard/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/cross-channel-guard/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("mercado_libre_active_mxn");
  });
});

describe("digest schedule CSV (Loop 156)", () => {
  it("GET /agent/digest/schedule/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/digest/schedule/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("cron");
  });
});

describe("dynamic repricing rule CSV (Loop 157)", () => {
  it("GET /listings/:listingId/dynamic-repricing-rule/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("anchor_type");
  });
});

describe("export store kinds (Loop 154-157)", () => {
  it("POST /exports cross_channel_guard_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "cross_channel_guard_csv",
        sku_id: "demo-sku-001",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports digest_schedule_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "digest_schedule_csv" }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports dynamic_repricing_rule_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "dynamic_repricing_rule_csv",
        listing_id: "listing-ml-001",
      }),
    });
    expect(post.status).toBe(200);
  });
});
