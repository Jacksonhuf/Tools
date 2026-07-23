import { describe, expect, it } from "vitest";
import { featureFlagKeyToCsv } from "../../apps/bff/src/feature-flag-key-csv.js";
import { agentReadinessToCsv } from "../../apps/bff/src/agent-readiness-csv.js";

describe("single-row CSV helpers (Loop 198-201)", () => {
  it("featureFlagKeyToCsv includes flag key", () => {
    const csv = featureFlagKeyToCsv("agent_copilot", true, "2026-07-22T12:00:00.000Z");
    expect(csv).toContain("agent_copilot");
    expect(csv).toContain("true");
  });

  it("agentReadinessToCsv single check", () => {
    const csv = agentReadinessToCsv(
      {
        ready: true,
        milestone: "P4",
        checks: [
          {
            id: "TC-NFR-SEC-004",
            passed: true,
            detail: "ok",
          },
        ],
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("TC-NFR-SEC-004");
  });
});
