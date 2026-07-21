import {
  tryValidateJwtBearer,
  tryValidateJwtBearerAsync,
  jwtAuthStatusExtras,
  jwtDriverReady,
} from "./auth-jwt-integration.js";

export type AuthDriver = "dev" | "oidc_stub" | "oidc_jwt";

const DRIVER_ALIASES: Record<string, AuthDriver> = {
  dev: "dev",
  oidc_stub: "oidc_stub",
  oidc: "oidc_stub",
  oidc_jwt: "oidc_jwt",
  jwt: "oidc_jwt",
};

export function resolveAuthDriver(raw?: string | null): AuthDriver {
  const key = (raw ?? process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  return DRIVER_ALIASES[key] ?? "dev";
}

export function getAuthStatus() {
  const driver = resolveAuthDriver();
  const issuer = process.env.OIDC_ISSUER_URL?.trim() || null;
  const base = {
    driver,
    oidc_issuer_configured: Boolean(issuer),
    ready:
      driver === "dev" ||
      driver === "oidc_stub" ||
      (driver === "oidc_jwt" && jwtDriverReady()),
    note:
      driver === "dev"
        ? "Static Bearer dev-token (local/CI)."
        : driver === "oidc_jwt"
          ? "JWT via HS256 secret and/or JWKS RS256 (Loop 43–46)."
          : "OIDC stub accepts dev-token or Bearer tokens prefixed with oidc-stub.",
  };
  return { ...base, ...jwtAuthStatusExtras() };
}

export type AuthValidationResult =
  | { ok: true; subject: string; mode: AuthDriver }
  | { ok: false; code: "INVALID_TOKEN" | "UNAUTHORIZED" };

const DEV_TOKEN = "dev-token";

function validateNonJwt(token: string, driver: AuthDriver): AuthValidationResult {
  if (token === DEV_TOKEN) {
    return { ok: true, subject: "dev-user", mode: driver };
  }
  if (driver === "oidc_stub" && token.startsWith("oidc-stub.")) {
    const subject = token.slice("oidc-stub.".length) || "oidc-user";
    return { ok: true, subject, mode: driver };
  }
  return { ok: false, code: "INVALID_TOKEN" };
}

export function validateBearerToken(token: string): AuthValidationResult {
  const driver = resolveAuthDriver();
  const base = validateNonJwt(token, driver);
  if (base.ok) return base;
  if (driver === "oidc_jwt") {
    const jwt = tryValidateJwtBearer(token);
    if (jwt) {
      return { ok: true, subject: jwt.sub, mode: driver };
    }
  }
  return { ok: false, code: "INVALID_TOKEN" };
}

export async function validateBearerTokenAsync(
  token: string
): Promise<AuthValidationResult> {
  const driver = resolveAuthDriver();
  const base = validateNonJwt(token, driver);
  if (base.ok) return base;
  if (driver === "oidc_jwt") {
    const jwt =
      (await tryValidateJwtBearerAsync(token)) ?? tryValidateJwtBearer(token);
    if (jwt) {
      return { ok: true, subject: jwt.sub, mode: driver };
    }
  }
  return { ok: false, code: "INVALID_TOKEN" };
}
