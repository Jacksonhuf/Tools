import { describe, expect, it } from "vitest";
import { listingSyncJobsToCsv } from "../../apps/bff/src/listing-sync-jobs-csv.js";
import { buildListingSyncOpsStatus } from "../../apps/bff/src/listing-sync-ops-status.js";
import { resetListingSyncJobsForTests } from "../../apps/bff/src/listing-sync-journal.js";
import { resetListingSyncScheduleForTests } from "../../apps/bff/src/listing-sync-schedule.js";
import { recordListingSyncJob } from "../../apps/bff/src/listing-sync-journal.js";

describe("listingSyncJobsToCsv", () => {
  it("includes job fields", () => {
    const csv = listingSyncJobsToCsv(
      [
        {
          id: "lsync-1",
          tenant_id: "tenant-demo",
          listing_id: "listing-ml-001",
          shop_id: "shop-ml-demo",
          external_ref: "MLM123456",
          status: "ok",
          channel_price_mxn: 100,
          error_code: null,
          started_at: "2026-07-22T00:00:00.000Z",
          finished_at: "2026-07-22T00:00:01.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("listing-ml-001");
    expect(csv).toContain("MLM123456");
  });
});

describe("buildListingSyncOpsStatus", () => {
  it("aggregates ok/failed counts", () => {
    resetListingSyncJobsForTests();
    resetListingSyncScheduleForTests();
    recordListingSyncJob({
      tenant_id: "tenant-demo",
      listing_id: "listing-ml-001",
      shop_id: "shop-ml-demo",
      external_ref: "x",
      status: "ok",
      channel_price_mxn: 1,
      error_code: null,
    });
    const status = buildListingSyncOpsStatus("tenant-demo", 10);
    expect(status.job_summary.ok).toBe(1);
    expect(status.job_summary.failed).toBe(0);
  });
});
