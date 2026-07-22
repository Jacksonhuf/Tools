import {
  decodeJwtSegments,
  verifyHs256Jwt,
  verifyRs256Jwt,
  base64UrlDecodeJson,
} from "./oidc-jwt.js";
import { getStaticJwksKeys, resolveJwksKey } from "./oidc-jwks.js";
import { resolveJwtClaimExpectations } from "./jwt-claims.js";

export { signHs256Jwt, signRs256Jwt, verifyHs256Jwt, verifyRs256Jwt } from "./oidc-jwt.js";

function isOidcJwtDriver(): boolean {
  const key = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  return key === "oidc_jwt" || key === "jwt";
}

export function getJwtAuthConfig() {
  const secret = process.env.OIDC_JWT_HS256_SECRET?.trim() || null;
  const jwksUrl = process.env.OIDC_JWKS_URL?.trim() || null;
  const jwksJson = Boolean(process.env.OIDC_JWKS_JSON?.trim());
  const claims = resolveJwtClaimExpectations();
  return {
    hs256_secret_configured: Boolean(secret),
    jwks_url: jwksUrl,
    jwks_json_configured: jwksJson,
    jwt_issuer_enforced: Boolean(claims.issuer),
    jwt_audience_enforced: Boolean(claims.audience),
    jwt_expected_issuer: claims.issuer,
    jwt_expected_audience: claims.audience,
  };
}

export function jwtDriverReady(): boolean {
  const cfg = getJwtAuthConfig();
  if (cfg.hs256_secret_configured) return true;
  const staticKeys = getStaticJwksKeys();
  if (staticKeys && staticKeys.size > 0) return true;
  return Boolean(cfg.jwks_url);
}

export async function tryValidateJwtBearerAsync(
  token: string
): Promise<{ sub: string } | null> {
  if (!isOidcJwtDriver()) return null;
  const segments = decodeJwtSegments(token);
  if (!segments) return null;
  const header = base64UrlDecodeJson(segments.headerSeg) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg === "HS256") {
    const secret = process.env.OIDC_JWT_HS256_SECRET?.trim();
    if (!secret) return null;
    return verifyHs256Jwt(token, secret);
  }
  if (header.alg === "RS256") {
    const key = await resolveJwksKey(header.kid);
    if (!key) return null;
    return verifyRs256Jwt(token, key);
  }
  return null;
}

export function tryValidateJwtBearer(token: string): { sub: string } | null {
  if (!isOidcJwtDriver()) return null;
  const segments = decodeJwtSegments(token);
  if (!segments) return null;
  const header = base64UrlDecodeJson(segments.headerSeg) as { alg?: string };
  if (header.alg !== "HS256") return null;
  const secret = process.env.OIDC_JWT_HS256_SECRET?.trim();
  if (!secret) return null;
  return verifyHs256Jwt(token, secret);
}

export function jwtAuthStatusExtras() {
  const driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  const cfg = getJwtAuthConfig();
  if (driver !== "oidc_jwt" && driver !== "jwt") return {};
  const ready = jwtDriverReady();
  const rs256 =
    cfg.jwks_json_configured || Boolean(cfg.jwks_url);
  return {
    jwt_hs256_configured: cfg.hs256_secret_configured,
    jwks_url_configured: Boolean(cfg.jwks_url),
    jwks_json_configured: cfg.jwks_json_configured,
    jwt_rs256_configured: rs256,
    jwt_issuer_enforced: cfg.jwt_issuer_enforced,
    jwt_audience_enforced: cfg.jwt_audience_enforced,
    ready,
    note: ready
      ? cfg.hs256_secret_configured
        ? "HS256 JWT (OIDC_JWT_HS256_SECRET) and/or RS256 via JWKS."
        : "RS256 JWT via OIDC_JWKS_JSON or OIDC_JWKS_URL."
      : "oidc_jwt requires OIDC_JWT_HS256_SECRET and/or JWKS config.",
  };
}
