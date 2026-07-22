export interface JwtClaimExpectations {
  issuer: string | null;
  audience: string | null;
}

export function resolveJwtClaimExpectations(): JwtClaimExpectations {
  const issuer =
    process.env.OIDC_JWT_ISSUER?.trim() ||
    process.env.OIDC_ISSUER_URL?.trim() ||
    null;
  const audience = process.env.OIDC_JWT_AUDIENCE?.trim() || null;
  return { issuer, audience };
}

export function validateStandardClaims(
  payload: { iss?: unknown; aud?: unknown },
  expected: JwtClaimExpectations
): boolean {
  if (expected.issuer) {
    if (payload.iss !== expected.issuer) return false;
  }
  if (expected.audience) {
    const aud = payload.aud;
    if (typeof aud === "string") {
      if (aud !== expected.audience) return false;
    } else if (Array.isArray(aud)) {
      if (!aud.some((a) => a === expected.audience)) return false;
    } else {
      return false;
    }
  }
  return true;
}
