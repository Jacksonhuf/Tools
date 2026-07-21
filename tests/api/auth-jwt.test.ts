import { describe, expect, it, beforeEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { createTestApp } from "../../apps/bff/src/app.js";
import { signHs256Jwt, signRs256Jwt } from "../../apps/bff/src/oidc-jwt.js";
import { resetJwksCacheForTests } from "../../apps/bff/src/oidc-jwks.js";

const TENANT = { "X-Tenant-Id": "tenant-demo" };
const SECRET = "loop43-test-secret";

describe("auth oidc_jwt", () => {
  beforeEach(() => {
    delete process.env.AUTH_DRIVER;
    delete process.env.OIDC_JWT_HS256_SECRET;
    delete process.env.OIDC_JWKS_JSON;
    delete process.env.OIDC_JWKS_URL;
    resetJwksCacheForTests();
  });

  it("TC-API-AUTH-003 accepts HS256 JWT when oidc_jwt configured", async () => {
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWT_HS256_SECRET = SECRET;
    const jwt = signHs256Jwt({ sub: "jwt-user-ops" }, SECRET);
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/metrics", {
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...TENANT,
      },
    });
    expect(res.status).toBe(200);
    const status = await app.request("/api/v1/auth/status", {
      headers: { Authorization: `Bearer ${jwt}`, ...TENANT },
    });
    const json = (await status.json()) as {
      driver: string;
      jwt_hs256_configured: boolean;
      ready: boolean;
    };
    expect(json.driver).toBe("oidc_jwt");
    expect(json.jwt_hs256_configured).toBe(true);
    expect(json.ready).toBe(true);
  });

  it("rejects expired JWT", async () => {
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWT_HS256_SECRET = SECRET;
    const jwt = signHs256Jwt(
      { sub: "expired", exp: Math.floor(Date.now() / 1000) - 60 },
      SECRET
    );
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/metrics", {
      headers: { Authorization: `Bearer ${jwt}`, ...TENANT },
    });
    expect(res.status).toBe(401);
  });

  it("TC-API-AUTH-004 accepts RS256 JWT via OIDC_JWKS_JSON", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const pubJwk = publicKey.export({ format: "jwk" }) as Record<
      string,
      unknown
    >;
    pubJwk.kid = "loop46";
    pubJwk.alg = "RS256";
    process.env.AUTH_DRIVER = "oidc_jwt";
    process.env.OIDC_JWKS_JSON = JSON.stringify({ keys: [pubJwk] });
    const jwt = signRs256Jwt({ sub: "rs256-ops" }, privateKey, "loop46");
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/metrics", {
      headers: { Authorization: `Bearer ${jwt}`, ...TENANT },
    });
    expect(res.status).toBe(200);
    const status = await app.request("/api/v1/auth/status", {
      headers: { Authorization: `Bearer ${jwt}`, ...TENANT },
    });
    const json = (await status.json()) as {
      jwt_rs256_configured: boolean;
      jwks_json_configured: boolean;
      ready: boolean;
    };
    expect(json.jwks_json_configured).toBe(true);
    expect(json.jwt_rs256_configured).toBe(true);
    expect(json.ready).toBe(true);
  });
});
