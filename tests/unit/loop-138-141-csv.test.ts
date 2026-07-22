import { describe, expect, it } from "vitest";
import { agentReadinessToCsv } from "../../apps/bff/src/agent-readiness-csv.js";
import { evaluateAgentReadiness } from "../../apps/bff/src/agent-readiness.js";
import { competitorAnchorToCsv } from "../../apps/bff/src/competitor-anchor-csv.js";
import { productReadinessToCsv } from "../../apps/bff/src/product-readiness-csv.js";
import { getProductReadinessSummary } from "../../apps/bff/src/agent-milestones.js";

describe("agentReadinessToCsv", () => {
  it("includes check_id", () => {
    const csv = agentReadinessToCsv(
      evaluateAgentReadiness(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("check_id");
  });
});

describe("competitorAnchorToCsv", () => {
  it("includes listing_id", () => {
    const csv = competitorAnchorToCsv(
      "listing-ml-001",
      {
        count: 2,
        min_mxn: 100,
        median_mxn: 110,
        primary_mxn: 105,
        buy_box_mxn: 100,
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("listing-ml-001");
  });
});

describe("productReadinessToCsv", () => {
  it("includes milestone rows", () => {
    const csv = productReadinessToCsv(
      getProductReadinessSummary(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("P3");
  });
});
