import { describe, expect, it } from "vitest";
import { competitorCurvePointsToCsv } from "../../apps/bff/src/competitor-curve-csv.js";
import { adjustmentBatchToCsv } from "../../apps/bff/src/adjustment-batch-csv.js";

describe("competitorCurvePointsToCsv", () => {
  it("serializes header and rows", () => {
    const csv = competitorCurvePointsToCsv([
      {
        date: "2026-07-20",
        observation_count: 2,
        min_effective_mxn: 100,
        max_effective_mxn: 110,
        avg_effective_mxn: 105,
      },
    ]);
    expect(csv).toContain("date,observation_count");
    expect(csv).toContain("2026-07-20,2,100,110,105");
  });
});

describe("adjustmentBatchToCsv", () => {
  it("includes batch metadata per item row", () => {
    const csv = adjustmentBatchToCsv({
      id: "adj-1",
      tenant_id: "tenant-demo",
      status: "draft",
      reason_code: "manual",
      created_at: "2026-07-22T00:00:00.000Z",
      approved_at: null,
      applied_at: null,
      items: [
        {
          id: "item-1",
          batch_id: "adj-1",
          listing_id: "listing-ml-001",
          explicit_price_mxn: 1600,
          from_price_mxn: 1500,
          guard_result: "ok",
          to_version_id: null,
        },
      ],
    });
    expect(csv).toContain("batch_id,status");
    expect(csv).toContain("adj-1,draft,manual,listing-ml-001,1600,1500,ok,");
  });
});
