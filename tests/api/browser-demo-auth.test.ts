import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { applyVercelServerlessDefaults } from "../../api/vercel-serverless-env.js";
import { applyVercelDemoAuthDefaults } from "../../apps/bff/src/browser-demo-auth.js";

const TENANT = { "X-Tenant-Id": "tenant-demo" };
const SECRET = "browser-demo-test-secret";

describe("browser demo auth", () => {
  beforeEach(() => {
    delete process.env.BROWSER_DEMO_AUTH;
    delete process.env.VERCEL;
    delete process.env.VERCEL_USE_PG;
    delete process.env.OIDC_JWT_HS256_SECRET;
    delete process.env.AUTH_DRIVER;
  });

  it("issues HS256 browser token when BROWSER_DEMO_AUTH=1", async () => {
    process.env.BROWSER_DEMO_AUTH = "1";
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWT_HS256_SECRET = SECRET;
    const { app } = createTestApp();

    const tokenRes = await app.request("/api/v1/auth/browser-token", {
      headers: TENANT,
    });
    expect(tokenRes.status).toBe(200);
    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };

    const res = await app.request("/api/v1/channels/adapters/status", {
      headers: { Authorization: `Bearer ${access_token}`, ...TENANT },
    });
    expect(res.status).toBe(200);
  });

  it("issues token at /api/v1/browser-token when rewritten to Hono", async () => {
    process.env.VERCEL = "1";
    applyVercelServerlessDefaults();
    const { app } = createTestApp();

    const tokenRes = await app.request("/api/v1/browser-token", {
      headers: TENANT,
    });
    expect(tokenRes.status).toBe(200);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const res = await app.request("/api/v1/channels/adapters/status", {
      headers: { Authorization: `Bearer ${access_token}`, ...TENANT },
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when browser demo auth is disabled", async () => {
    process.env.BROWSER_DEMO_AUTH = "0";
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWT_HS256_SECRET = SECRET;
    const { app } = createTestApp();

    const tokenRes = await app.request("/api/v1/auth/browser-token", {
      headers: TENANT,
    });
    expect(tokenRes.status).toBe(404);
  });

  it("auto-enables on Vercel in-memory demo deploys without explicit JWT secret", async () => {
    process.env.VERCEL = "1";
    applyVercelServerlessDefaults();
    const { app } = createTestApp();

    const tokenRes = await app.request("/api/v1/auth/browser-token", {
      headers: TENANT,
    });
    expect(tokenRes.status).toBe(200);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const res = await app.request("/api/v1/channels/adapters/status", {
      headers: { Authorization: `Bearer ${access_token}`, ...TENANT },
    });
    expect(res.status).toBe(200);
  });

  it("uses demo secret when BROWSER_DEMO_AUTH=1 even with VERCEL_USE_PG", async () => {
    process.env.BROWSER_DEMO_AUTH = "1";
    process.env.VERCEL = "1";
    process.env.VERCEL_USE_PG = "1";
    process.env.AUTH_DRIVER = "oidc_jwt";
    const { app } = createTestApp();

    const tokenRes = await app.request("/api/v1/auth/browser-token", {
      headers: TENANT,
    });
    expect(tokenRes.status).toBe(200);
  });

  it("ignores placeholder OIDC_JWT_HS256_SECRET from env examples", async () => {
    process.env.VERCEL = "1";
    process.env.BROWSER_DEMO_AUTH = "1";
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWT_HS256_SECRET = "use-vercel-sensitive-secret";
    applyVercelDemoAuthDefaults();
    const { app } = createTestApp();

    const tokenRes = await app.request("/api/v1/auth/browser-token", {
      headers: TENANT,
    });
    expect(tokenRes.status).toBe(200);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const res = await app.request("/api/v1/channels/adapters/status", {
      headers: { Authorization: `Bearer ${access_token}`, ...TENANT },
    });
    expect(res.status).toBe(200);
  });
});
