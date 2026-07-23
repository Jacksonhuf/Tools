import { describe, expect, it } from "vitest";
import { priceVersionToCsv } from "../../apps/bff/src/price-version-csv.js";
import { versionBackupToCsv } from "../../apps/bff/src/version-backup-csv.js";
import { p5ReadinessToCsv } from "../../apps/bff/src/p5-readiness-csv.js";
import { evaluateP5Readiness } from "../../apps/bff/src/p5-readiness.js";

describe("priceVersionToCsv", () => {
  it("includes version_id", () => {
    const csv = priceVersionToCsv(
      {
        id: "ver-1",
        sku_id: "demo-sku-001",
        channel: "MERCADO_LIBRE",
        state: "active",
        publish_price_mxn: 1500,
        created_at: "2026-07-22T00:00:00.000Z",
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("ver-1");
  });
});

describe("versionBackupToCsv", () => {
  it("includes catalog_driver", () => {
    const csv = versionBackupToCsv(
      {
        tenant_id: "tenant-demo",
        sku_count: 1,
        version_count: 0,
        catalog_driver: "memory",
        versions: [],
        exported_at: "2026-07-22T00:00:00.000Z",
      },
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("memory");
  });
});

describe("p5ReadinessToCsv", () => {
  it("includes P5-01", () => {
    const csv = p5ReadinessToCsv(
      evaluateP5Readiness(),
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("P5-01");
  });
});
