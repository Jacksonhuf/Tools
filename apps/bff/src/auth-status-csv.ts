import type { getAuthStatus } from "./auth.js";

type AuthStatusSnapshot = ReturnType<typeof getAuthStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function flag(value: unknown): string {
  return value === true ? "true" : "false";
}

export function authStatusToCsv(
  status: AuthStatusSnapshot,
  exportedAt: string
): string {
  const extra = status as AuthStatusSnapshot & {
    jwt_hs256_configured?: boolean;
    jwks_url_configured?: boolean;
    jwt_rs256_configured?: boolean;
  };
  const lines = [
    "exported_at,driver,ready,oidc_issuer_configured,jwt_hs256_configured,jwks_url_configured,jwt_rs256_configured,note",
  ];
  lines.push(
    [
      exportedAt,
      cell(status.driver),
      flag(status.ready),
      flag(status.oidc_issuer_configured),
      flag(extra.jwt_hs256_configured),
      flag(extra.jwks_url_configured),
      flag(extra.jwt_rs256_configured),
      cell(status.note),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
