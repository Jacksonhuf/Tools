import { describe, expect, it } from "vitest";
import { fxRatesToCsv } from "../../apps/bff/src/fx-rates-csv.js";
import { agentToolAuditToCsv } from "../../apps/bff/src/agent-audit-csv.js";

describe("fxRatesToCsv", () => {
  it("includes rate columns", () => {
    const csv = fxRatesToCsv(
      [
        {
          base: "USD",
          quote: "MXN",
          rate: 20,
          buffer_pct: 2,
          effective_from: "2026-01-01T00:00:00.000Z",
          source: "demo",
        },
      ],
      "2026-07-22T00:00:00.000Z"
    );
    expect(csv).toContain("USD,MXN,20");
  });
});

describe("agentToolAuditToCsv", () => {
  it("includes tool_name", () => {
    const csv = agentToolAuditToCsv(
      [
        {
          id: "aud-1",
          tenant_id: "tenant-demo",
          tool_name: "tool_list_skus",
          session_id: null,
          arguments_json: {},
          result_summary: "ok",
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("tool_list_skus");
  });
});
