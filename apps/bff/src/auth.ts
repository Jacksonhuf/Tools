export type AuthDriver = "dev" | "oidc_stub";

const DRIVER_ALIASES: Record<string, AuthDriver> = {
  dev: "dev",
  oidc_stub: "oidc_stub",
  oidc: "oidc_stub",
};

export function resolveAuthDriver(raw?: string | null): AuthDriver {
  const key = (raw ?? process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  return DRIVER_ALIASES[key] ?? "dev";
}

export function getAuthStatus() {
  const driver = resolveAuthDriver();
  const issuer = process.env.OIDC_ISSUER_URL?.trim() || null;
  return {
    driver,
    oidc_issuer_configured: Boolean(issuer),
    ready: driver === "dev" || driver === "oidc_stub",
    note:
      driver === "dev"
        ? "Static Bearer dev-token (local/CI)."
        : "OIDC stub accepts dev-token or Bearer tokens prefixed with oidc-stub.",
  };
}

export type AuthValidationResult =
  | { ok: true; subject: string; mode: AuthDriver }
  | { ok: false; code: "INVALID_TOKEN" | "UNAUTHORIZED" };

const DEV_TOKEN = "dev-token";

export function validateBearerToken(token: string): AuthValidationResult {
  const driver = resolveAuthDriver();
  if (token === DEV_TOKEN) {
    return { ok: true, subject: "dev-user", mode: driver };
  }
  if (driver === "oidc_stub" && token.startsWith("oidc-stub.")) {
    const subject = token.slice("oidc-stub.".length) || "oidc-user";
    return { ok: true, subject, mode: driver };
  }
  return { ok: false, code: "INVALID_TOKEN" };
}
