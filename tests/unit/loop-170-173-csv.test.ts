import { describe, expect, it } from "vitest";
import { p3ReadinessToCsv } from "../../apps/bff/src/p3-readiness-csv.js";
import { p4ReadinessToCsv } from "../../apps/bff/src/p4-readiness-csv.js";
import { evaluateP3Readiness } from "../../apps/bff/src/p3-readiness.js";
import { evaluateAgentReadiness } from "../../apps/bff/src/agent-readiness.js";

describe("p3ReadinessToCsv", () => {
  it("includes test_file column", () => {
    const csv = p3ReadinessToCsv(
      evaluateP3Readiness(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("test_file");
    expect(csv).toContain("TC-INT-CH-003/004");
  });
});

describe("p4ReadinessToCsv", () => {
  it("includes TC-NFR-SEC-004", () => {
    const csv = p4ReadinessToCsv(
      evaluateAgentReadiness(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("TC-NFR-SEC-004");
  });
});
