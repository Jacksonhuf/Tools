import type { LucideIcon } from "lucide-react";
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
import type { AppTab } from "@/components/layout/types";

export type NavItem = {
  id: AppTab;
  labelKey: string;
  testId: string;
  icon: LucideIcon;
  keywords?: string[];
};

export type NavGroup = {
  labelKey: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "navGroupPricing",
    items: [
      {
        id: "pricing",
        labelKey: "navPricing",
        testId: "nav-pricing",
        icon: TrendingUp,
        keywords: ["simulate", "price", "dual"],
      },
      {
        id: "skuCost",
        labelKey: "navSkuCost",
        testId: "nav-sku-cost",
        icon: Package,
        keywords: ["cost", "landed", "sku"],
      },
      {
        id: "adjustments",
        labelKey: "navAdjustments",
        testId: "nav-adjustments",
        icon: ClipboardList,
        keywords: ["batch", "approval"],
      },
    ],
  },
  {
    labelKey: "navGroupChannels",
    items: [
      {
        id: "channels",
        labelKey: "navChannels",
        testId: "nav-channels",
        icon: Store,
        keywords: ["shop", "oauth", "sandbox"],
      },
      {
        id: "competitors",
        labelKey: "navCompetitors",
        testId: "nav-competitors",
        icon: Tags,
        keywords: ["competitor", "anchor"],
      },
      {
        id: "crossChannel",
        labelKey: "navCrossChannel",
        testId: "nav-cross-channel",
        icon: Globe2,
        keywords: ["cross", "dashboard", "guard"],
      },
    ],
  },
  {
    labelKey: "navGroupPlatform",
    items: [
      {
        id: "ops",
        labelKey: "navOps",
        testId: "nav-ops",
        icon: LayoutDashboard,
        keywords: ["queue", "repricing", "metrics"],
      },
      {
        id: "copilot",
        labelKey: "navCopilot",
        testId: "nav-copilot",
        icon: Bot,
        keywords: ["ai", "agent", "chat", "copilot"],
      },
      {
        id: "readiness",
        labelKey: "navReadiness",
        testId: "nav-readiness",
        icon: ShieldCheck,
        keywords: ["milestone", "flags", "p4"],
      },
      {
        id: "policy",
        labelKey: "navPolicy",
        testId: "nav-policy",
        icon: Settings2,
        keywords: ["policy", "config"],
      },
    ],
  },
];

export const APP_LOGO_ICON = BarChart3;
