import { describe, expect, it } from "vitest";
import { crossChannelGuardToCsv } from "../../apps/bff/src/cross-channel-guard-csv.js";
import { digestScheduleToCsv } from "../../apps/bff/src/digest-schedule-csv.js";
import { dynamicRepricingRuleToCsv } from "../../apps/bff/src/dynamic-repricing-rule-csv.js";

describe("crossChannelGuardToCsv", () => {
  it("includes spread columns", () => {
    const csv = crossChannelGuardToCsv(
      "demo-sku-001",
      {
        mercado_libre_active_mxn: 1000,
        amazon_mx_active_mxn: 1100,
        warning: {
          code: "CROSS_CHANNEL_SPREAD",
          spread_pct: 9.09,
          max_spread_pct: 5,
        },
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("warning_active");
    expect(csv).toContain("CROSS_CHANNEL_SPREAD");
  });
});

describe("digestScheduleToCsv", () => {
  it("includes cron", () => {
    const csv = digestScheduleToCsv(
      {
        tenant_id: "tenant-demo",
        enabled: true,
        cron: "0 8 * * *",
        email_to: "ops@example.com",
        timezone: "America/Mexico_City",
        updated_at: "2026-07-22T00:00:00.000Z",
        last_dispatch_at: null,
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("0 8 * * *");
  });
});

describe("dynamicRepricingRuleToCsv", () => {
  it("includes anchor_type", () => {
    const csv = dynamicRepricingRuleToCsv(
      {
        listing_id: "listing-ml-001",
        rule: {
          enabled: true,
          action: "MATCH_MEDIAN",
          anchor_type: "MEDIAN",
          offset: { type: "PERCENT", value: -2 },
          cooldown_min: 60,
          daily_limit: 3,
          min_gap_mxn: 10,
          frozen: false,
          business_hours_only: true,
        },
        stale: {
          competitor_stale_frozen: false,
          competitor_stale_since: null,
        },
        category_template: null,
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("MEDIAN");
  });
});
