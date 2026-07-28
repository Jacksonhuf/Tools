import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { signHs256Jwt } from "../../apps/bff/src/oidc-jwt.js";
import { principalPermissions } from "../../apps/bff/src/rbac.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const SECRET = "wave2-rbac-test";

describe("GET /api/v1/auth/me", () => {
  it("returns principal permissions for dev-token", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/auth/me", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      subject: string;
      permissions: { pricing_write: boolean; finance_approve: boolean };
    };
    expect(json.subject).toBe("dev-user");
    expect(json.permissions.pricing_write).toBe(true);
    expect(json.permissions.finance_approve).toBe(true);
  });
});

describe("principalPermissions", () => {
  it("finance role can approve but not write cost", () => {
    const perms = principalPermissions(["finance"]);
    expect(perms.finance_approve).toBe(true);
    expect(perms.pricing_write).toBe(false);
  });
});

describe("Prod Wave 2 — RBAC cost writes", () => {
  beforeEach(() => {
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWT_HS256_SECRET = SECRET;
  });

  it("returns 403 for cost sheet create without pricing:write", async () => {
    const jwt = signHs256Jwt({ sub: "finance-only", roles: ["finance"] }, SECRET);
    const { app } = createTestApp();
    const res = await app.request("/api/v1/skus/demo-sku-001/cost-sheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...TENANT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batch_no: "RBAC-1",
        cogs_amount: 100,
        cogs_currency: "MXN",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for approve without finance:approve", async () => {
    const jwt = signHs256Jwt(
      { sub: "pricing-only", roles: ["pricing_operator"] },
      SECRET
    );
    const { app, adjustments } = createTestApp();
    const batch = await adjustments.createBatch({
      tenant_id: "tenant-demo",
      reason_code: "rbac",
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
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          ...TENANT,
        },
      }
    );
    expect(res.status).toBe(403);
  });
});
