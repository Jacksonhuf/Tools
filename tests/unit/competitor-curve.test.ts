import { describe, expect, it } from "vitest";
import { buildCompetitorCurve } from "../../apps/bff/src/competitor-curve.js";

describe("buildCompetitorCurve", () => {
  it("aggregates by calendar day", () => {
    const points = buildCompetitorCurve([
      { observed_at: "2026-07-22T10:00:00.000Z", effective_price: 100 },
      { observed_at: "2026-07-22T12:00:00.000Z", effective_price: 120 },
      { observed_at: "2026-07-21T09:00:00.000Z", effective_price: 90 },
    ]);
    expect(points.length).toBe(2);
    expect(points[1].avg_effective_mxn).toBe(110);
  });
});
