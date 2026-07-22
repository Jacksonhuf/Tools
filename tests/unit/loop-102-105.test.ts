import { describe, expect, it } from "vitest";
import { agentDigestToCsv } from "../../apps/bff/src/agent-digest-csv.js";
import { tariffHsRatesToCsv } from "../../apps/bff/src/tariff-hs-csv.js";
import { batchPatchSkuPolicies } from "../../apps/bff/src/sku-policy-batch.js";
import { MemoryCatalogRepository } from "../../apps/bff/src/repositories/index.js";

describe("agentDigestToCsv", () => {
  it("includes metrics rows", () => {
    const csv = agentDigestToCsv({
      date: "2026-07-22",
      tenant_id: "tenant-demo",
      locale: "en",
      narrative: "Hello",
      metrics: {
        sku_count: 1,
        suggested_versions: 2,
        pending_versions: 1,
        open_reconciliation_alerts: 0,
        agent_tool_invocations_today: 3,
      },
      queue_highlights: [],
    });
    expect(csv).toContain("suggested_versions,2");
  });
});

describe("tariffHsRatesToCsv", () => {
  it("includes hs_code", () => {
    const csv = tariffHsRatesToCsv(
      [
        {
          hs_code: "8517.12.00",
          description: "Phones",
          tariff_rate: 0.05,
          customs_fee_mxn: 0,
        },
      ],
      "2026-07-22T00:00:00.000Z"
    );
    expect(csv).toContain("8517.12.00");
  });
});

describe("batchPatchSkuPolicies", () => {
  it("skips unknown sku", async () => {
    const catalog = new MemoryCatalogRepository();
    const result = await batchPatchSkuPolicies(catalog, "tenant-demo", [
      { sku_id: "demo-sku-001", target_margin_pct: 19 },
      { sku_id: "nope", target_margin_pct: 19 },
    ]);
    expect(result.updated.length).toBe(1);
    expect(result.errors.length).toBe(1);
  });
});
