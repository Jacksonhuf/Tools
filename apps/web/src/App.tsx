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
import { AppLayout, type AppTab } from "./components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  const { i18n } = useTranslation();
  const [tab, setTab] = useState<AppTab>("pricing");

  return (
    <AuthProvider locale={i18n.language}>
      <AppLayout activeTab={tab} onTabChange={setTab}>
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
      </AppLayout>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
