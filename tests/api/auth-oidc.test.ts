import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { getAuthStatus, validateBearerToken } from "../../apps/bff/src/auth.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };

describe("auth oidc stub", () => {
  beforeEach(() => {
    delete process.env.AUTH_DRIVER;
  });

  it("TC-API-AUTH-001 GET /auth/status defaults dev", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/auth/status", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { driver: string };
    expect(json.driver).toBe("dev");
  });

  it("TC-API-AUTH-002 oidc_stub accepts oidc-stub prefix", () => {
    process.env.AUTH_DRIVER = "oidc_stub";
    const r = validateBearerToken("oidc-stub.ops-user");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.subject).toBe("ops-user");
    expect(getAuthStatus().driver).toBe("oidc_stub");
  });

  it("oidc_stub rejects unknown token", async () => {
    process.env.AUTH_DRIVER = "oidc_stub";
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/metrics", {
      headers: {
        Authorization: "Bearer unknown",
        ...TENANT,
      },
    });
    expect(res.status).toBe(401);
  });
});
