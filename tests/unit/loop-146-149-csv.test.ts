import { describe, expect, it } from "vitest";
import { authStatusToCsv } from "../../apps/bff/src/auth-status-csv.js";
import { getAuthStatus } from "../../apps/bff/src/auth.js";
import { channelSandboxStatusToCsv } from "../../apps/bff/src/channel-sandbox-status-csv.js";
import { getChannelSandboxStatus } from "../../apps/bff/src/channel-sandbox-ledger.js";
import { digestDeadLetterSummaryToCsv } from "../../apps/bff/src/digest-dead-letter-summary-csv.js";

describe("authStatusToCsv", () => {
  it("includes driver", () => {
    const csv = authStatusToCsv(getAuthStatus(), "2026-07-22T12:00:00.000Z");
    expect(csv).toContain("dev");
  });
});

describe("channelSandboxStatusToCsv", () => {
  it("includes mode", () => {
    const csv = channelSandboxStatusToCsv(
      getChannelSandboxStatus(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("mode");
  });
});

describe("digestDeadLetterSummaryToCsv", () => {
  it("includes dead_letter_sampled", () => {
    const csv = digestDeadLetterSummaryToCsv(
      {
        tenant_id: "tenant-demo",
        queue: { total: 0, queued: 0, failed: 0, dead_letter: 0 },
        dead_letter_sampled: 0,
        items: [],
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("dead_letter_sampled");
  });
});
