import { describe, expect, it } from "vitest";
import { competitorOffersToCsv } from "../../apps/bff/src/competitor-offers-csv.js";
import { sharedFeeTemplatesToCsv } from "../../apps/bff/src/shared-fee-templates-csv.js";
import { opsMetricsToCsv } from "../../apps/bff/src/ops-metrics-csv.js";

describe("competitorOffersToCsv", () => {
  it("includes offer_id", () => {
    const csv = competitorOffersToCsv(
      "listing-ml-001",
      [
        {
          id: "offer-1",
          listing_id: "listing-ml-001",
          channel: "MERCADO_LIBRE",
          external_ref: "MLM-1",
          seller_id: null,
          label: "Comp",
          is_primary: true,
          created_at: "2026-07-22T00:00:00.000Z",
          latest_effective_mxn: 1399,
          latest_observed_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("offer-1");
  });
});

describe("sharedFeeTemplatesToCsv", () => {
  it("includes template_id", () => {
    const csv = sharedFeeTemplatesToCsv(
      [
        {
          id: "fee-tpl-1",
          tenant_id: "tenant-demo",
          channel: "MERCADO_LIBRE",
          category_id: "cat-electronics-mx",
          name: "ML",
          template: {
            commission_pct_of_price: 18,
            payment_pct_of_price: 3,
            fulfillment_fixed_mxn: 40,
          },
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("fee-tpl-1");
  });
});

describe("opsMetricsToCsv", () => {
  it("includes tenant_id", () => {
    const csv = opsMetricsToCsv(
      {
        tenant_id: "tenant-demo",
        catalog_driver: "memory",
        channel_sandbox: { enabled: true, mode: "sandbox", event_count: 0 },
        channel_adapters: {
          driver: "mock",
          ready: true,
          publish_http_url_configured: false,
          listing_pull_http_url_configured: false,
        },
        digest_queue: { total: 0, queued: 0, failed: 0, dead_letter: 0 },
        repricing_batch_queue: {
          queued: 0,
          total: 0,
          driver: "memory",
        },
        nfr: {
          pricing_simulate_count: 1,
          pricing_calc_duration_ms_avg: 2.5,
        },
        generated_at: "2026-07-22T00:00:00.000Z",
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("tenant-demo");
  });
});
