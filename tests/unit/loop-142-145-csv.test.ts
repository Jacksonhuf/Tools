import { describe, expect, it } from "vitest";
import { digestQueuedJobsSummaryToCsv } from "../../apps/bff/src/digest-queued-jobs-summary-csv.js";
import { channelAdapterStatusToCsv } from "../../apps/bff/src/channel-adapters-status-csv.js";
import { ruleCompilerStatusToCsv } from "../../apps/bff/src/rule-compiler-status-csv.js";
import { getChannelAdapterStatus } from "../../apps/bff/src/channel-adapter-factory.js";
import { getRuleCompilerStatus } from "../../apps/bff/src/rule-compiler-adapter.js";

describe("digestQueuedJobsSummaryToCsv", () => {
  it("includes queue_total", () => {
    const csv = digestQueuedJobsSummaryToCsv(
      {
        tenant_id: "tenant-demo",
        queue: { total: 2, queued: 1, failed: 0, dead_letter: 1 },
        sampled: 1,
        items: [],
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("2");
  });
});

describe("channelAdapterStatusToCsv", () => {
  it("includes driver", () => {
    const csv = channelAdapterStatusToCsv(
      getChannelAdapterStatus(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("mock");
  });
});

describe("ruleCompilerStatusToCsv", () => {
  it("includes driver", () => {
    const csv = ruleCompilerStatusToCsv(
      getRuleCompilerStatus(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("driver");
  });
});
