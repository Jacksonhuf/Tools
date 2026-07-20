import { describe, expect, it, beforeEach } from "vitest";
import {
  createVersion,
  listVersions,
  resetVersionsForTests,
} from "../../apps/bff/src/version-store.js";

describe("TC-INT-VER-002 active unique", () => {
  beforeEach(() => resetVersionsForTests());

  it("supersedes previous active on same sku+channel", () => {
    const v1 = createVersion({
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 1500,
    });
    const v2 = createVersion({
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "active",
      publish_price_mxn: 1600,
    });
    const all = listVersions("demo-sku-001");
    expect(v1.state).toBe("superseded");
    expect(v2.state).toBe("active");
    expect(all.filter((v) => v.state === "active")).toHaveLength(1);
  });
});
