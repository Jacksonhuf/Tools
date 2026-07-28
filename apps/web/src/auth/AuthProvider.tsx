import { useEffect, useState, type ReactNode } from "react";
import { fetchAuthMe } from "../api/client";
import { AuthContext } from "./AuthContext";
import { DEFAULT_PERMISSIONS, type AuthPrincipalView } from "./types";

export function AuthProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const [principal, setPrincipal] = useState<AuthPrincipalView>({
    subject: "dev-user",
    tenant_id: "tenant-demo",
    roles: [],
    permissions: DEFAULT_PERMISSIONS,
  });

  useEffect(() => {
    void fetchAuthMe(locale)
      .then(setPrincipal)
      .catch(() => {
        setPrincipal({
          subject: "dev-user",
          tenant_id: "tenant-demo",
          roles: [],
          permissions: DEFAULT_PERMISSIONS,
        });
      });
  }, [locale]);

  return (
    <AuthContext.Provider value={principal}>{children}</AuthContext.Provider>
  );
}
