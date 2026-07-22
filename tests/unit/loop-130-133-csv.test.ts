import { describe, expect, it } from "vitest";
import { listingSyncOpsStatusToCsv } from "../../apps/bff/src/listing-sync-ops-status-csv.js";
import { agentToolsToCsv } from "../../apps/bff/src/agent-tools-csv.js";

describe("listingSyncOpsStatusToCsv", () => {
  it("includes schedule_enabled", () => {
    const csv = listingSyncOpsStatusToCsv(
      {
        schedule: {
          tenant_id: "tenant-demo",
          enabled: true,
          cron_expression: "0 * * * *",
          note: "",
          updated_at: "2026-07-22T00:00:00.000Z",
          last_run_at: null,
        },
        job_summary: {
          sampled: 2,
          ok: 1,
          failed: 1,
          last_finished_at: "2026-07-22T00:00:00.000Z",
        },
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("true");
  });
});

describe("agentToolsToCsv", () => {
  it("includes tool_name", () => {
    const csv = agentToolsToCsv(
      [
        {
          name: "tool_simulate",
          mode: "read",
          description: "Simulate",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("tool_simulate");
  });
});
