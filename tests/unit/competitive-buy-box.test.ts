import { describe, expect, it } from "vitest";
import { aggregateAnchor } from "@mx-pricing/pricing-engine";

describe("aggregateAnchor buy_box", () => {
  it("uses lowest price for buy_box anchor type", () => {
    expect(aggregateAnchor("buy_box", [1500, 1425, 1600])).toBe(1425);
  });
});
