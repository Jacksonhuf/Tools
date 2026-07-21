import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("pricing snapshot report", () => {
  it("GET JSON pricing-snapshot (TC-API-RPT-001)", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/reports/pricing-snapshot?format=json&sku_id=demo-sku-001",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { rows: Array<{ channel: string }> };
    expect(json.rows).toHaveLength(2);
    expect(json.rows.map((r) => r.channel).sort()).toEqual([
      "AMAZON_MX",
      "MERCADO_LIBRE",
    ]);
  });

  it("GET CSV pricing-snapshot includes header (TC-API-RPT-002)", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1650 }),
    });
    const res = await app.request(
      "/api/v1/reports/pricing-snapshot?format=csv&sku_id=demo-sku-001",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("exported_at,sku_id,sku_code,channel");
    expect(text).toContain("demo-sku-001");
    expect(text).toContain("MERCADO_LIBRE");
    expect(text).toContain("1650");
  });
});
