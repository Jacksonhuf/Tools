import { describe, expect, it } from "vitest";
import { repricingEventsToCsv } from "../../apps/bff/src/repricing-events-csv.js";
import { adjustmentBatchesIndexToCsv } from "../../apps/bff/src/adjustment-batches-index-csv.js";

describe("single-row CSV helpers (Loop 190-193)", () => {
  it("repricingEventsToCsv includes event_id", () => {
    const csv = repricingEventsToCsv(
      [
        {
          id: "rev-1",
          tenant_id: "tenant-demo",
          listing_id: "listing-ml-001",
          channel: "MERCADO_LIBRE",
          type: "competitor_change",
          status: "pending",
          payload: {},
          dedupe_key: null,
          processed_at: null,
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("rev-1");
  });

  it("adjustmentBatchesIndexToCsv includes batch_id", () => {
    const csv = adjustmentBatchesIndexToCsv(
      [
        {
          id: "adj-1",
          tenant_id: "tenant-demo",
          status: "draft",
          reason_code: "test",
          items: [
            {
              id: "item-1",
              listing_id: "listing-ml-001",
              explicit_price_mxn: 1500,
              from_price_mxn: 1400,
              guard_result: "ok",
              to_version_id: null,
            },
          ],
          created_at: "2026-07-22T00:00:00.000Z",
          approved_at: null,
          applied_at: null,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("adj-1");
  });
});
