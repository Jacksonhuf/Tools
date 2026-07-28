import { createContext, useContext } from "react";
import type { AuthPrincipalView } from "./types";
import { DEFAULT_PERMISSIONS } from "./types";

export const AuthContext = createContext<AuthPrincipalView>({
  subject: "dev-user",
  tenant_id: "tenant-demo",
  roles: [],
  permissions: DEFAULT_PERMISSIONS,
});

export function useAuth(): AuthPrincipalView {
  return useContext(AuthContext);
}

export function useCanApprove(): boolean {
  return useAuth().permissions.finance_approve;
}

export function useCanPricingWrite(): boolean {
  return useAuth().permissions.pricing_write;
}
