import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import type { AppTab } from "./types";

export type { AppTab } from "./types";
export { PageHeader, PageIntent } from "@/components/patterns/PageIntent";

export function AppLayout({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}) {
  return (
    <AppShell activeTab={activeTab} onTabChange={onTabChange}>
      {children}
    </AppShell>
  );
}

export function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "applied":
    case "connected":
      return "default";
    case "pending_approval":
      return "outline";
    case "expired":
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}
