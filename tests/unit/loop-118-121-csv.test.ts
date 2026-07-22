import { describe, expect, it } from "vitest";
import { priceHistoryToCsv } from "../../apps/bff/src/price-history-csv.js";
import { repricingEventsToCsv } from "../../apps/bff/src/repricing-events-csv.js";
import { adjustmentBatchesIndexToCsv } from "../../apps/bff/src/adjustment-batches-index-csv.js";

describe("priceHistoryToCsv", () => {
  it("includes observation_id", () => {
    const csv = priceHistoryToCsv(
      "listing-ml-001",
      [
        {
          id: "obs-1",
          offer_id: "offer-1",
          observed_at: "2026-07-22T00:00:00.000Z",
          list_price: 1400,
          sale_price: 1399,
          shipping_addon: 0,
          effective_price: 1399,
          currency: "MXN",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("obs-1");
  });
});

describe("repricingEventsToCsv", () => {
  it("includes event_id", () => {
    const csv = repricingEventsToCsv(
      [
        {
          id: "evt-1",
          tenant_id: "tenant-demo",
          listing_id: "listing-ml-001",
          channel: "MERCADO_LIBRE",
          type: "competitor_price_changed",
          status: "pending",
          payload: {},
          dedupe_key: null,
          processed_at: null,
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("evt-1");
  });
});

describe("adjustmentBatchesIndexToCsv", () => {
  it("includes batch_id", () => {
    const csv = adjustmentBatchesIndexToCsv(
      [
        {
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
              from_price_mxn: null,
              guard_result: null,
              to_version_id: null,
            },
          ],
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("adj-1");
  });
});
