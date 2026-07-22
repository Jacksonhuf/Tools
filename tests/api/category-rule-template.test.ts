import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("TC-API-CAT-001 category rule templates (P5-02)", () => {
  it("returns template for demo SKU category", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/category-rule-template",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      category_id: string;
      template: { category_id: string };
    };
    expect(json.category_id).toBe("cat-electronics-mx");
    expect(json.template.category_id).toBe("cat-electronics-mx");
  });

  it("merges category defaults into dynamic repricing rule GET", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      rule: { category_template_id: string; tier: string };
    };
    expect(json.rule.category_template_id).toBe("cat-electronics-mx");
    expect(json.rule.tier).toBe("standard");
  });
});

describe("TC-API-TPL-001 shared fee templates (P5-04)", () => {
  it("lists tenant shared fee templates", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/tenants/tenant-demo/shared-fee-templates",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: unknown[] };
    expect(json.items.length).toBeGreaterThanOrEqual(2);
  });
});
