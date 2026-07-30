import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PricingPage } from "./components/PricingPage";
import { AdjustmentBatchesPage } from "./components/AdjustmentBatchesPage";
import { ChannelsPage } from "./components/ChannelsPage";
import { CompetitorsPage } from "./components/CompetitorsPage";
import { OpsCenterPage } from "./components/OpsCenterPage";
import { CopilotPage } from "./components/CopilotPage";
import { ProductReadinessPage } from "./components/ProductReadinessPage";
import { CrossChannelDashboardPage } from "./components/CrossChannelDashboardPage";
import { PolicyConfigPage } from "./components/PolicyConfigPage";
import { SkuCostPage } from "./components/SkuCostPage";
import { AuthProvider } from "./auth/AuthProvider";
import { AppShell, type NavItem } from "./ui";

type Tab =
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

const NAV: Array<{ id: Tab; labelKey: string; testId: string }> = [
  { id: "pricing", labelKey: "navPricing", testId: "nav-pricing" },
  { id: "skuCost", labelKey: "navSkuCost", testId: "nav-sku-cost" },
  { id: "adjustments", labelKey: "navAdjustments", testId: "nav-adjustments" },
  { id: "channels", labelKey: "navChannels", testId: "nav-channels" },
  { id: "competitors", labelKey: "navCompetitors", testId: "nav-competitors" },
  { id: "crossChannel", labelKey: "navCrossChannel", testId: "nav-cross-channel" },
  { id: "ops", labelKey: "navOps", testId: "nav-ops" },
  { id: "copilot", labelKey: "navCopilot", testId: "nav-copilot" },
  { id: "readiness", labelKey: "navReadiness", testId: "nav-readiness" },
  { id: "policy", labelKey: "navPolicy", testId: "nav-policy" },
];

export function App() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("pricing");

  const navItems: NavItem[] = NAV.map((n) => ({
    id: n.id,
    label: t(n.labelKey),
    testId: n.testId,
  }));

  return (
    <AuthProvider locale={i18n.language}>
      <AppShell
        brand={t("appTitle")}
        navItems={navItems}
        activeId={tab}
        onNavigate={(id) => setTab(id as Tab)}
        languageSelect={
          <select
            className="lang-select"
            aria-label="language"
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
            <option value="es-MX">Español (MX)</option>
          </select>
        }
      >
        {tab === "pricing" ? (
          <PricingPage />
        ) : tab === "skuCost" ? (
          <SkuCostPage />
        ) : tab === "adjustments" ? (
          <AdjustmentBatchesPage />
        ) : tab === "channels" ? (
          <ChannelsPage />
        ) : tab === "competitors" ? (
          <CompetitorsPage />
        ) : tab === "crossChannel" ? (
          <CrossChannelDashboardPage />
        ) : tab === "ops" ? (
          <OpsCenterPage />
        ) : tab === "readiness" ? (
          <ProductReadinessPage />
        ) : tab === "policy" ? (
          <PolicyConfigPage />
        ) : (
          <CopilotPage />
        )}
      </AppShell>
    </AuthProvider>
  );
}
