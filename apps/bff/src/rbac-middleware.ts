import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./app.js";
import type { Context } from "hono";
import { principalHasRole, type AppRole } from "./rbac.js";

export function assertPrincipalRoles(
  c: Context<AppEnv>,
  required: AppRole | AppRole[]
): void {
  const roles = c.get("authRoles") ?? [];
  const principal = {
    subject: c.get("authSubject"),
    tenantId: c.get("tenantId"),
    roles,
    mode: "dev" as const,
  };
  if (!principalHasRole(principal, required)) {
    throw new HTTPException(403, { message: "FORBIDDEN" });
  }
}
