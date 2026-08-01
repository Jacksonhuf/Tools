import { describe, expect, it } from "vitest";
import {
  buildWaterfallBarSegments,
  legacyRowsToSteps,
} from "../../apps/web/src/utils/waterfall";

describe("waterfall ladder utils", () => {
  const fmt = (n: number) => `$${n.toFixed(0)}`;

  it("builds segments from retail to landed steps", () => {
    const steps = [
      {
        layer_id: "LIST_PRICE",
        kind: "total" as const,
        amount_mxn: 2000,
        running_total_mxn: 2000,
      },
      {
        layer_id: "PLATFORM_COMMISSION",
        kind: "decrease" as const,
        amount_mxn: 360,
        running_total_mxn: 1640,
      },
      {
        layer_id: "LANDED",
        kind: "subtotal" as const,
        amount_mxn: 1000,
        running_total_mxn: 1000,
      },
    ];

    const segments = buildWaterfallBarSegments(steps, fmt);
    expect(segments).toHaveLength(3);
    expect(segments[0].yTop).toBeLessThan(segments[0].yBottom);
    expect(segments[2].layer_id).toBe("LANDED");
  });

  it("legacyRowsToSteps produces list and landed anchors", () => {
    const steps = legacyRowsToSteps(
      [
        { layer_id: "LANDED", amount_mxn: 1000 },
        { layer_id: "LIST_PRICE", amount_mxn: 1800 },
      ],
      1800
    );
    expect(steps[0].layer_id).toBe("LIST_PRICE");
    expect(steps[steps.length - 1].layer_id).toBe("LANDED");
  });
});
