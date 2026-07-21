import { describe, expect, it } from "vitest";
import {
  maxWaterfallAmount,
  sortWaterfallRows,
} from "../../apps/web/src/utils/waterfall";

describe("P0-E6-05 waterfall utils", () => {
  it("sorts rows by amount descending", () => {
    const sorted = sortWaterfallRows([
      { layer_id: "LANDED", amount_mxn: 1000 },
      { layer_id: "LIST_PRICE", amount_mxn: 1500 },
    ]);
    expect(sorted[0].layer_id).toBe("LIST_PRICE");
  });

  it("maxWaterfallAmount avoids divide by zero", () => {
    expect(maxWaterfallAmount([])).toBe(1);
  });
});
