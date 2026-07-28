import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./app.js";
import type { Context } from "hono";
import type { AuthPrincipal } from "./auth-principal.js";
import { principalHasRole, type AppRole } from "./rbac.js";

export function principalFromContext(c: Context<AppEnv>): AuthPrincipal {
  return {
    subject: c.get("authSubject"),
    tenantId: c.get("tenantId"),
    roles: c.get("authRoles") ?? [],
    mode: "dev",
  };
}

export function assertPrincipalRoles(
  c: Context<AppEnv>,
  required: AppRole | AppRole[]
): void {
  if (!principalHasRole(principalFromContext(c), required)) {
    throw new HTTPException(403, { message: "FORBIDDEN" });
  }
}
