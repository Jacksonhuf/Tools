import type { AuthDriver } from "./auth.js";
import { isProductionMode } from "./production-config.js";
import {
  tryValidateJwtBearer,
  tryValidateJwtBearerAsync,
} from "./auth-jwt-integration.js";
import { base64UrlDecodeJson, decodeJwtSegments } from "./oidc-jwt.js";
import { resolveJwtClaimExpectations, validateStandardClaims } from "./jwt-claims.js";

export interface AuthPrincipal {
  subject: string;
  tenantId: string;
  roles: string[];
  mode: AuthDriver;
}

const DEV_TOKEN = "dev-token";

function readRolesFromPayload(payload: Record<string, unknown>): string[] {
  const roles = payload.roles;
  if (Array.isArray(roles)) {
    return roles.filter((r): r is string => typeof r === "string");
  }
  const role = payload.role;
  if (typeof role === "string" && role.trim()) {
    return [role.trim()];
  }
  return ["pricing:read"];
}

function readTenantFromPayload(
  payload: Record<string, unknown>,
  fallback: string
): string {
  const tenant =
    payload.tenant_id ?? payload.tenantId ?? payload["https://mx-pricing/tenant_id"];
  if (typeof tenant === "string" && tenant.trim()) {
    return tenant.trim();
  }
  return fallback;
}

function principalFromJwtPayload(
  payload: Record<string, unknown>,
  mode: AuthDriver,
  headerTenantId: string
): AuthPrincipal | null {
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) return null;
  const exp = payload.exp;
  if (typeof exp === "number" && exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (!validateStandardClaims(payload, resolveJwtClaimExpectations())) {
    return null;
  }
  return {
    subject: sub,
    tenantId: readTenantFromPayload(payload, headerTenantId),
    roles: readRolesFromPayload(payload),
    mode,
  };
}

function principalFromDevToken(
  driver: AuthDriver,
  headerTenantId: string
): AuthPrincipal {
  return {
    subject: "dev-user",
    tenantId: headerTenantId,
    roles: ["pricing:read", "pricing:write", "channel:admin", "finance:approve"],
    mode: driver,
  };
}

function principalFromOidcStub(
  token: string,
  driver: AuthDriver,
  headerTenantId: string
): AuthPrincipal | null {
  if (!token.startsWith("oidc-stub.")) return null;
  const subject = token.slice("oidc-stub.".length) || "oidc-user";
  return {
    subject,
    tenantId: headerTenantId,
    roles: ["pricing:read", "pricing:write"],
    mode: driver,
  };
}

async function principalFromJwtToken(
  token: string,
  driver: AuthDriver,
  headerTenantId: string
): Promise<AuthPrincipal | null> {
  const segments = decodeJwtSegments(token);
  if (!segments) return null;
  const payload = base64UrlDecodeJson(segments.payloadSeg) as Record<
    string,
    unknown
  >;
  const verified =
    (await tryValidateJwtBearerAsync(token)) ?? tryValidateJwtBearer(token);
  if (!verified) return null;
  return principalFromJwtPayload(payload, driver, headerTenantId);
}

export type PrincipalValidationResult =
  | { ok: true; principal: AuthPrincipal }
  | { ok: false; code: "INVALID_TOKEN" | "UNAUTHORIZED" | "TENANT_MISMATCH" };

export async function resolveAuthPrincipal(
  token: string,
  headerTenantId: string,
  driver: AuthDriver
): Promise<PrincipalValidationResult> {
  const tenantHeader = headerTenantId.trim() || "tenant-demo";

  if (token === DEV_TOKEN) {
    if (isProductionMode()) {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    if (driver === "dev" || driver === "oidc_stub") {
      return { ok: true, principal: principalFromDevToken(driver, tenantHeader) };
    }
  }

  if (driver === "oidc_stub") {
    const stub = principalFromOidcStub(token, driver, tenantHeader);
    if (stub) return { ok: true, principal: stub };
  }

  if (driver === "oidc_jwt") {
    const jwtPrincipal = await principalFromJwtToken(token, driver, tenantHeader);
    if (jwtPrincipal) {
      const claimTenant = jwtPrincipal.tenantId;
      if (
        claimTenant !== tenantHeader &&
        process.env.ENFORCE_JWT_TENANT_CLAIM !== "false"
      ) {
        return { ok: false, code: "TENANT_MISMATCH" };
      }
      return { ok: true, principal: jwtPrincipal };
    }
  }

  return { ok: false, code: "INVALID_TOKEN" };
}
