import { describe, expect, it } from "vitest";
import { skusCatalogToCsv } from "../../apps/bff/src/skus-catalog-csv.js";
import { shopsToCsv } from "../../apps/bff/src/shops-csv.js";
import { categoryRuleTemplatesToCsv } from "../../apps/bff/src/category-rule-templates-csv.js";

describe("skusCatalogToCsv", () => {
  it("includes sku_id", () => {
    const csv = skusCatalogToCsv(
      [
        {
          id: "demo-sku-001",
          sku_code: "SKU-001",
          name: "Demo",
          landed_cost_mxn: 1000,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("demo-sku-001");
  });
});

describe("shopsToCsv", () => {
  it("includes shop_id", () => {
    const csv = shopsToCsv(
      [
        {
          id: "shop-ml-demo",
          channel: "MERCADO_LIBRE",
          name: "ML Demo",
          external_seller_id: null,
          auth_status: "disconnected",
          token_expires_at: null,
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("shop-ml-demo");
  });
});

describe("categoryRuleTemplatesToCsv", () => {
  it("includes category_id", () => {
    const csv = categoryRuleTemplatesToCsv(
      [
        {
          category_id: "cat-electronics-mx",
          tenant_id: "tenant-demo",
          name: "Electronics",
          defaults: { action: "suggest", anchor_type: "median_competitor" },
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("cat-electronics-mx");
  });
});
