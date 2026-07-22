import { describe, expect, it } from "vitest";
import { repricingBatchJobsSummaryToCsv } from "../../apps/bff/src/repricing-batch-jobs-summary-csv.js";
import { listingIngestStatusToCsv } from "../../apps/bff/src/listing-ingest-status-csv.js";
import { featureFlagsToCsv } from "../../apps/bff/src/feature-flags-csv.js";
import { getFeatureFlags } from "../../apps/bff/src/feature-flags.js";

describe("repricingBatchJobsSummaryToCsv", () => {
  it("includes driver", () => {
    const csv = repricingBatchJobsSummaryToCsv(
      {
        driver: "memory",
        summary: {
          sampled: 1,
          queued: 0,
          processing: 0,
          completed: 1,
          failed: 0,
        },
        last_job_at: "2026-07-22T00:00:00.000Z",
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("memory");
  });
});

describe("listingIngestStatusToCsv", () => {
  it("includes listing_id", () => {
    const csv = listingIngestStatusToCsv(
      {
        listing_id: "listing-ml-001",
        tier: "T1",
        next_run_at: "2026-07-22T00:00:00.000Z",
        interval_ms: 3600000,
        ingest_failed: false,
        ingest_failed_at: null,
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("listing-ml-001");
  });
});

describe("featureFlagsToCsv", () => {
  it("includes agent_copilot", () => {
    const csv = featureFlagsToCsv(getFeatureFlags(), "2026-07-22T12:00:00.000Z");
    expect(csv).toContain("agent_copilot");
  });
});
