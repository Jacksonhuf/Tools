import { describe, expect, it } from "vitest";
import { pricingContextToCsv } from "../../apps/bff/src/pricing-context-csv.js";
import { buildSkuPricingContextView } from "../../apps/bff/src/pricing-context-view.js";
import { createTestApp } from "../../apps/bff/src/app.js";
import { copilotSessionToCsv } from "../../apps/bff/src/copilot-session-csv.js";
import { createCopilotSession } from "../../apps/bff/src/copilot-session.js";

describe("pricingContextToCsv", () => {
  it("includes landed_cost_mxn", async () => {
    const { catalog, competitors } = createTestApp();
    const view = await buildSkuPricingContextView(
      { catalog, competitors },
      "tenant-demo",
      "demo-sku-001",
      "en",
      "MERCADO_LIBRE"
    );
    expect(view).not.toBeNull();
    const csv = pricingContextToCsv(view!, "2026-07-22T12:00:00.000Z");
    expect(csv).toContain("landed_cost_mxn");
  });
});

describe("copilotSessionToCsv", () => {
  it("includes session_id", () => {
    const session = createCopilotSession({
      tenant_id: "tenant-demo",
      listing_id: "listing-ml-001",
      sku_id: "demo-sku-001",
    });
    const csv = copilotSessionToCsv(session, "2026-07-22T12:00:00.000Z");
    expect(csv).toContain(session.session_id);
  });
});
