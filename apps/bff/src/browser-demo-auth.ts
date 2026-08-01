import { resolveJwtClaimExpectations } from "./jwt-claims.js";
import { signHs256Jwt } from "./oidc-jwt.js";

export function isBrowserDemoAuthEnabled(): boolean {
  const raw = process.env.BROWSER_DEMO_AUTH?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  // Vercel in-memory demo deploys (no Postgres cutover).
  return process.env.VERCEL === "1" && process.env.VERCEL_USE_PG !== "1";
}

export function issueBrowserDemoToken(tenantId: string): string | null {
  if (!isBrowserDemoAuthEnabled()) return null;
  const secret = process.env.OIDC_JWT_HS256_SECRET?.trim();
  if (!secret) return null;

  const claims = resolveJwtClaimExpectations();
  const payload: {
    sub: string;
    tenant_id: string;
    roles: string[];
    iss?: string;
    aud?: string | string[];
  } = {
    sub: "browser-demo-user",
    tenant_id: tenantId,
    roles: [
      "pricing:read",
      "pricing:write",
      "channel:admin",
      "finance:approve",
    ],
  };
  if (claims.issuer) payload.iss = claims.issuer;
  if (claims.audience) payload.aud = claims.audience;

  return signHs256Jwt(payload, secret);
}
