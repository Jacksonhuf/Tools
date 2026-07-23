import { describe, expect, it } from "vitest";
import { listingsToCsv } from "../../apps/bff/src/listing-csv.js";

describe("listingsToCsv", () => {
  it("includes listing_id", () => {
    const csv = listingsToCsv(
      [
        {
          id: "listing-ml-001",
          sku_id: "demo-sku-001",
          channel: "MERCADO_LIBRE",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("listing-ml-001");
    expect(csv).toContain("MERCADO_LIBRE");
  });
});
