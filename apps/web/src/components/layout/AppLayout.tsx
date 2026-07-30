import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bot,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Package,
  Settings2,
  ShieldCheck,
  Store,
  Tags,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AppTab =
  | "pricing"
  | "skuCost"
  | "adjustments"
  | "channels"
  | "competitors"
  | "crossChannel"
  | "ops"
  | "copilot"
  | "readiness"
  | "policy";

type NavItem = {
  id: AppTab;
  labelKey: string;
  testId: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_GROUPS: Array<{ labelKey: string; items: NavItem[] }> = [
  {
    labelKey: "navGroupPricing",
    items: [
      { id: "pricing", labelKey: "navPricing", testId: "nav-pricing", icon: TrendingUp },
      { id: "skuCost", labelKey: "navSkuCost", testId: "nav-sku-cost", icon: Package },
      { id: "adjustments", labelKey: "navAdjustments", testId: "nav-adjustments", icon: ClipboardList },
    ],
  },
  {
    labelKey: "navGroupChannels",
    items: [
      { id: "channels", labelKey: "navChannels", testId: "nav-channels", icon: Store },
      { id: "competitors", labelKey: "navCompetitors", testId: "nav-competitors", icon: Tags },
      { id: "crossChannel", labelKey: "navCrossChannel", testId: "nav-cross-channel", icon: Globe2 },
    ],
  },
  {
    labelKey: "navGroupPlatform",
    items: [
      { id: "ops", labelKey: "navOps", testId: "nav-ops", icon: LayoutDashboard },
      { id: "copilot", labelKey: "navCopilot", testId: "nav-copilot", icon: Bot },
      { id: "readiness", labelKey: "navReadiness", testId: "nav-readiness", icon: ShieldCheck },
      { id: "policy", labelKey: "navPolicy", testId: "nav-policy", icon: Settings2 },
    ],
  },
];

export function AppLayout({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex min-h-screen bg-background" data-testid="app-shell">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">{t("appTitle")}</span>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-testid={item.testId}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" />
                        {t(item.labelKey)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b bg-card px-6">
          <Select
            value={i18n.language}
            onValueChange={(value) => void i18n.changeLanguage(value)}
          >
            <SelectTrigger className="w-[140px]" aria-label="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-CN">中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es-MX">Español (MX)</SelectItem>
            </SelectContent>
          </Select>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
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
