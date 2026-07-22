import { describe, expect, it } from "vitest";
import { crossChannelDashboardToCsv } from "../../apps/bff/src/cross-channel-dashboard-csv.js";
import { costSheetsToCsv } from "../../apps/bff/src/cost-sheets-csv.js";
import { repricingBatchJobsToCsv } from "../../apps/bff/src/repricing-batch-jobs-csv.js";

describe("crossChannelDashboardToCsv", () => {
  it("renders sku rows", () => {
    const csv = crossChannelDashboardToCsv({
      tenant_id: "tenant-demo",
      sku_count: 1,
      alert_count: 0,
      generated_at: "2026-07-22T00:00:00.000Z",
      items: [
        {
          sku_id: "demo-sku-001",
          sku_code: "DEMO",
          name: "Demo",
          mercado_libre_active_mxn: 100,
          amazon_mx_active_mxn: 110,
          warning: null,
        },
      ],
    });
    expect(csv).toContain("demo-sku-001");
  });
});

describe("costSheetsToCsv", () => {
  it("includes batch_no", () => {
    const csv = costSheetsToCsv(
      [
        {
          id: "cs-1",
          tenant_id: "tenant-demo",
          sku_id: "demo-sku-001",
          batch_no: "B-1",
          cogs_amount: 100,
          cogs_currency: "MXN",
          freight_alloc_mxn: 0,
          freight_alloc_rule: "PER_UNIT",
          effective_from: "2026-07-22",
          source: "manual",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("B-1");
  });
});

describe("repricingBatchJobsToCsv", () => {
  it("includes job_id", () => {
    const csv = repricingBatchJobsToCsv(
      [
        {
          job_id: "rbj-1",
          tenant_id: "tenant-demo",
          scope: "sku",
          sku_id: "demo-sku-001",
          shard_total: 4,
          sku_ids: null,
          status: "queued",
          created_at: "2026-07-22T00:00:00.000Z",
          updated_at: "2026-07-22T00:00:00.000Z",
          error: null,
          result: null,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("rbj-1");
  });
});
