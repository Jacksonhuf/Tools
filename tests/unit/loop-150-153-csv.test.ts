import { describe, expect, it } from "vitest";
import { listingSyncScheduleToCsv } from "../../apps/bff/src/listing-sync-schedule-csv.js";
import { agentMilestonesToCsv } from "../../apps/bff/src/agent-milestones-csv.js";
import { adjustmentApprovalPolicyToCsv } from "../../apps/bff/src/adjustment-approval-policy-csv.js";
import { opsWorkersStatusSummaryToCsv } from "../../apps/bff/src/ops-workers-status-summary-csv.js";
import { getProductMilestoneStatus } from "../../apps/bff/src/agent-milestones.js";
import { getAdjustmentApprovalPolicy } from "../../apps/bff/src/adjustment-approval-policy.js";
import { getAsyncWorkerStatus } from "../../apps/bff/src/worker-heartbeat.js";

describe("listingSyncScheduleToCsv", () => {
  it("includes cron_expression", () => {
    const csv = listingSyncScheduleToCsv(
      {
        tenant_id: "tenant-demo",
        enabled: false,
        cron_expression: "0 */6 * * *",
        note: "stub",
        updated_at: "2026-07-22T00:00:00.000Z",
        last_run_at: null,
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("0 */6 * * *");
  });
});

describe("agentMilestonesToCsv", () => {
  it("includes P3", () => {
    const csv = agentMilestonesToCsv(
      getProductMilestoneStatus(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("P3");
  });
});

describe("adjustmentApprovalPolicyToCsv", () => {
  it("includes max_drop_pct", () => {
    const csv = adjustmentApprovalPolicyToCsv(
      getAdjustmentApprovalPolicy(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("max_drop_pct_without_approval");
  });
});

describe("opsWorkersStatusSummaryToCsv", () => {
  it("includes worker_count", () => {
    const csv = opsWorkersStatusSummaryToCsv(
      getAsyncWorkerStatus(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("worker_count");
  });
});
