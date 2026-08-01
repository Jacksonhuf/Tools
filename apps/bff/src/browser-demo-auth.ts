import { resolveJwtClaimExpectations } from "./jwt-claims.js";
import { signHs256Jwt } from "./oidc-jwt.js";

/** Built-in JWT secret for Vercel in-memory demo only — not for real production. */
export const VERCEL_DEMO_JWT_SECRET =
  "mx-pricing-vercel-demo-jwt-secret-replace-me";

const PLACEHOLDER_SECRETS = new Set(
  [
    "use-vercel-sensitive-secret",
    "change-me",
    "changeme",
    "please-replace",
  ].map((s) => s.toLowerCase())
);

function normalizeSecret(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (PLACEHOLDER_SECRETS.has(value.toLowerCase())) return null;
  return value;
}

export function isBrowserDemoAuthEnabled(): boolean {
  const raw = process.env.BROWSER_DEMO_AUTH?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  // Vercel in-memory demo deploys (no Postgres cutover).
  return process.env.VERCEL === "1" && process.env.VERCEL_USE_PG !== "1";
}

export function resolveBrowserDemoJwtSecret(): string | null {
  const configured = normalizeSecret(process.env.OIDC_JWT_HS256_SECRET);
  if (configured) return configured;
  if (isBrowserDemoAuthEnabled()) {
    return VERCEL_DEMO_JWT_SECRET;
  }
  return null;
}

export function issueBrowserDemoToken(tenantId: string): string | null {
  if (!isBrowserDemoAuthEnabled()) return null;
  const secret = resolveBrowserDemoJwtSecret();
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

export function applyVercelDemoAuthDefaults(): void {
  if (process.env.VERCEL !== "1" || !isBrowserDemoAuthEnabled()) {
    return;
  }
  if (!normalizeSecret(process.env.OIDC_JWT_HS256_SECRET)) {
    process.env.OIDC_JWT_HS256_SECRET = VERCEL_DEMO_JWT_SECRET;
  }
  if (!process.env.AUTH_DRIVER?.trim()) {
    process.env.AUTH_DRIVER = "oidc_jwt";
  }
  if (!process.env.SHOP_CREDENTIAL_ENCRYPTION_KEY?.trim()) {
    process.env.SHOP_CREDENTIAL_ENCRYPTION_KEY =
      "vercel-demo-shop-credential-key!!";
  }
}
