import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetTariffHsForTests } from "../../apps/bff/src/tariff-hs-table.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("agent digest CSV (Loop 102)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("GET /agent/digest/daily/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/digest/daily/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("suggested_versions");
  });

  it("POST /exports kind agent_digest_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: "agent_digest_csv" }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    expect(dl.status).toBe(200);
  });
});

describe("tariff HS CSV (Loop 103)", () => {
  beforeEach(() => {
    resetTariffHsForTests();
  });

  it("GET /tariff-hs-rates/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/tariff-hs-rates/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("HS-ELECTRONICS-MX");
  });
});

describe("SKU policy batch (Loop 104)", () => {
  it("POST /skus/policy/batch updates margins", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus/policy/batch", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        items: [
          { sku_id: "demo-sku-001", target_margin_pct: 21, min_margin_pct: 11 },
          { sku_id: "missing-sku", target_margin_pct: 20 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      updated: Array<{ sku_id: string }>;
      errors: Array<{ sku_id: string; error: string }>;
    };
    expect(json.updated.length).toBe(1);
    expect(json.errors[0]?.error).toBe("SKU_NOT_FOUND");
    const get = await app.request("/api/v1/skus/demo-sku-001/pricing-context", {
      headers: { ...AUTH, ...TENANT, "Accept-Language": "en" },
    });
    const ctx = (await get.json()) as {
      policy: { target_margin_pct: number; min_margin_pct: number };
    };
    expect(ctx.policy.target_margin_pct).toBe(21);
    expect(ctx.policy.min_margin_pct).toBe(11);
  });
});
