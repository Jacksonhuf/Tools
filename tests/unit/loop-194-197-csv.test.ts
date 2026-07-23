import { describe, expect, it } from "vitest";
import { pricingSnapshotToCsv } from "../../apps/bff/src/pricing-report-service.js";
import { agentToolsToCsv } from "../../apps/bff/src/agent-tools-csv.js";

describe("single-row CSV helpers (Loop 194-197)", () => {
  it("pricingSnapshotToCsv includes channel", () => {
    const csv = pricingSnapshotToCsv(
      [
        {
          sku_id: "demo-sku-001",
          sku_code: "DEMO",
          channel: "MERCADO_LIBRE",
          active_price_mxn: 1000,
          floor_price_mxn: 900,
          landed_cost_mxn: 800,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("MERCADO_LIBRE");
  });

  it("agentToolsToCsv includes tool name", () => {
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
