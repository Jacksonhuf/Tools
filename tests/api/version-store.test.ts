import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

describe("TC-INT-VER-002 active unique", () => {
  let catalog: ReturnType<typeof createTestApp>["catalog"];

  beforeEach(() => {
    const t = createTestApp();
    catalog = t.catalog;
    t.catalog.resetForTests?.();
    t.adjustments.resetForTests?.();
  });

  it("supersedes previous active on same sku+channel", async () => {
    const v1 = await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 1500,
    });
    const v2 = await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 1600,
    });
    const all = await catalog.listVersions("demo-sku-001");
    expect(v1.state).toBe("superseded");
    expect(v2.state).toBe("active");
    expect(all.filter((v) => v.state === "active")).toHaveLength(1);
  });
});
