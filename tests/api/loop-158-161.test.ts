import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("SKU repricing queue CSV (Loop 158)", () => {
  it("GET /skus/:skuId/repricing-queue/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-queue/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("version_id");
  });
});

describe("repricing batch shard plan CSV (Loop 159)", () => {
  it("GET /skus/:skuId/repricing-batch/shard-plan/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/shard-plan/export?shard_total=2",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("shard_index");
  });
});

describe("SKU category rule template CSV (Loop 160)", () => {
  it("GET /skus/:skuId/category-rule-template/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/category-rule-template/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("template_name");
  });
});

describe("reconciliation alerts report export (Loop 161)", () => {
  it("GET /reports/reconciliation-alerts/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/reports/reconciliation-alerts/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("listing_id");
  });
});

describe("export store kinds (Loop 158-160)", () => {
  it("POST /exports repricing_queue_sku_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "repricing_queue_sku_csv",
        sku_id: "demo-sku-001",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports repricing_batch_shard_plan_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "repricing_batch_shard_plan_csv",
        sku_id: "demo-sku-001",
        shard_total: 2,
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports sku_category_rule_template_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "sku_category_rule_template_csv",
        sku_id: "demo-sku-001",
      }),
    });
    expect(post.status).toBe(200);
  });
});
