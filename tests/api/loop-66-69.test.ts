import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetFxRatesForTests } from "../../apps/bff/src/fx-rate-table.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { buildVersionBackupSnapshot } from "../../apps/bff/src/version-backup-service.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-UNIT-COST-001 fx landed cost API (Loop 66)", () => {
  beforeEach(() => {
    resetFxRatesForTests();
    const t = createTestApp();
    t.catalog.resetForTests?.();
  });

  it("POST /skus/:id/landed-cost/from-fx matches GL-COST-001", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/landed-cost/from-fx",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ cogs_amount: 100, cogs_currency: "USD" }),
      }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      computed: { cogs_mxn: number; landed_cost_mxn: number };
    };
    expect(json.computed.cogs_mxn).toBe(2040);
    expect(json.computed.landed_cost_mxn).toBe(2040);
  });

  it("GET /fx-rates lists USD/MXN demo row", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/fx-rates", {
      headers: { ...AUTH, ...TENANT },
    });
    const json = (await res.json()) as {
      items: Array<{ base: string; rate: number }>;
    };
    expect(json.items.some((r) => r.base === "USD" && r.rate === 20)).toBe(
      true
    );
  });
});

describe("TC-API-ADJ-002b approval policy (Loop 67)", () => {
  it("GET /adjustment-batches/approval-policy", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/adjustment-batches/approval-policy",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      max_drop_pct_without_approval: number;
    };
    expect(json.max_drop_pct_without_approval).toBe(5);
  });
});

describe("P0-E1-06 export store (Loop 68)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports then GET with token", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "version_backup" }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as {
      export_id: string;
      token: string;
      download_path: string;
    };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    expect(dl.status).toBe(200);
    const text = await dl.text();
    expect(text).toContain("tenant_id");
  });
});

describe("X-05 backup validate (Loop 69)", () => {
  it("POST /ops/version-backup/validate accepts snapshot", async () => {
    const { app, catalog } = createTestApp();
    const snapshot = await buildVersionBackupSnapshot(
      catalog,
      "tenant-demo"
    );
    const res = await app.request("/api/v1/ops/version-backup/validate", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ snapshot }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { valid: boolean };
    expect(json.valid).toBe(true);
  });
});
