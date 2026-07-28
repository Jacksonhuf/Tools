import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { ROLES } from "../../apps/bff/src/rbac.js";
import { principalHasRole } from "../../apps/bff/src/rbac.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("Prod Wave 4 — RBAC approve", () => {
  it("dev-token can approve (has finance:approve via dev roles)", async () => {
    const { app, adjustments } = createTestApp();
    const tenantId = "tenant-demo";
    const batch = await adjustments.createBatch({
      tenant_id: tenantId,
      reason_code: "test",
      status: "pending_approval",
      items: [
        {
          listing_id: "listing-ml-001",
          explicit_price_mxn: 1400,
          from_price_mxn: 1500,
          guard_result: null,
        },
      ],
    });
    const res = await app.request(
      `/api/v1/adjustment-batches/${batch.id}/approve`,
      { method: "POST", headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
  });
});

describe("Prod Wave 4 — reconciliation run-due", () => {
  it("POST /ops/reconciliation/run-due returns results", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/shops/shop-ml-demo/oauth/mock-complete", {
      method: "POST",
      headers: { ...AUTH, ...TENANT, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await app.request("/api/v1/ops/reconciliation/run-due", {
      method: "POST",
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { checked: number; results: unknown[] };
    expect(json.checked).toBeGreaterThan(0);
    expect(Array.isArray(json.results)).toBe(true);
  });
});

describe("RBAC role expansion", () => {
  it("admin alias includes finance approve", () => {
    expect(
      principalHasRole(
        {
          subject: "u",
          tenantId: "t",
          roles: ["admin"],
          mode: "dev",
        },
        ROLES.FINANCE_APPROVE
      )
    ).toBe(true);
  });
});
