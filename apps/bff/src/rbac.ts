import type { AuthPrincipal } from "./auth-principal.js";

export const ROLES = {
  PRICING_READ: "pricing:read",
  PRICING_WRITE: "pricing:write",
  CHANNEL_ADMIN: "channel:admin",
  FINANCE_APPROVE: "finance:approve",
  OPS_READ: "ops:read",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

const ROLE_ALIASES: Record<string, AppRole[]> = {
  admin: [
    ROLES.PRICING_READ,
    ROLES.PRICING_WRITE,
    ROLES.CHANNEL_ADMIN,
    ROLES.FINANCE_APPROVE,
    ROLES.OPS_READ,
  ],
  pricing_operator: [ROLES.PRICING_READ, ROLES.PRICING_WRITE],
  finance: [ROLES.PRICING_READ, ROLES.FINANCE_APPROVE],
  channel_ops: [ROLES.PRICING_READ, ROLES.CHANNEL_ADMIN, ROLES.OPS_READ],
};

function expandRoles(roles: string[]): Set<string> {
  const out = new Set<string>();
  for (const role of roles) {
    const alias = ROLE_ALIASES[role];
    if (alias) {
      for (const r of alias) out.add(r);
    } else {
      out.add(role);
    }
  }
  return out;
}

export function principalHasRole(
  principal: AuthPrincipal,
  required: AppRole | AppRole[]
): boolean {
  const needed = Array.isArray(required) ? required : [required];
  const granted = expandRoles(principal.roles);
  return needed.every((r) => granted.has(r));
}

export function requirePrincipalRoles(
  principal: AuthPrincipal,
  required: AppRole | AppRole[]
): void {
  if (!principalHasRole(principal, required)) {
    throw new Error("FORBIDDEN");
  }
}

export function expandPrincipalRoles(roles: string[]): AppRole[] {
  return [...expandRoles(roles)] as AppRole[];
}

export function principalPermissions(roles: string[]) {
  const principal: AuthPrincipal = {
    subject: "",
    tenantId: "",
    roles,
    mode: "dev",
  };
  return {
    pricing_read: principalHasRole(principal, ROLES.PRICING_READ),
    pricing_write: principalHasRole(principal, ROLES.PRICING_WRITE),
    channel_admin: principalHasRole(principal, ROLES.CHANNEL_ADMIN),
    finance_approve: principalHasRole(principal, ROLES.FINANCE_APPROVE),
    ops_read: principalHasRole(principal, ROLES.OPS_READ),
  };
}
