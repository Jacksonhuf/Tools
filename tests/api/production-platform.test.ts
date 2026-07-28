import { describe, expect, it } from "vitest";
import {
  evaluateProductionConfig,
  isProductionMode,
} from "../../apps/bff/src/production-config.js";
import { resolveAuthPrincipal } from "../../apps/bff/src/auth-principal.js";
import { principalHasRole, ROLES } from "../../apps/bff/src/rbac.js";
import { createTestApp } from "../../apps/bff/src/app.js";

describe("production-config", () => {
  it("defaults to non-production in test env", () => {
    expect(isProductionMode()).toBe(false);
    const cfg = evaluateProductionConfig();
    expect(cfg.production_mode).toBe(false);
    expect(cfg.dev_token_allowed).toBe(true);
  });
});

describe("auth principal + RBAC", () => {
  it("dev-token grants pricing roles in dev driver", async () => {
    const result = await resolveAuthPrincipal(
      "dev-token",
      "tenant-demo",
      "dev"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        principalHasRole(result.principal, ROLES.PRICING_WRITE)
      ).toBe(true);
    }
  });

  it("rejects dev-token when production mode is on", async () => {
    const prev = process.env.PRODUCTION_MODE;
    process.env.PRODUCTION_MODE = "true";
    try {
      const result = await resolveAuthPrincipal(
        "dev-token",
        "tenant-demo",
        "oidc_jwt"
      );
      expect(result.ok).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.PRODUCTION_MODE;
      else process.env.PRODUCTION_MODE = prev;
    }
  });
});

describe("GET /api/v1/production/readiness", () => {
  it("returns production readiness snapshot", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/production/readiness", {
      headers: {
        Authorization: "Bearer dev-token",
        "X-Tenant-Id": "tenant-demo",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      production: { production_mode: boolean };
      auth: { driver: string };
      channels: { driver: string };
    };
    expect(json.production.production_mode).toBe(false);
    expect(json.auth.driver).toBeDefined();
    expect(json.channels.driver).toBeDefined();
  });
});
