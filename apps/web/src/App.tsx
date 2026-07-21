import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PricingPage } from "./components/PricingPage";
import { AdjustmentBatchesPage } from "./components/AdjustmentBatchesPage";
import { ChannelsPage } from "./components/ChannelsPage";
import { CompetitorsPage } from "./components/CompetitorsPage";
import { OpsCenterPage } from "./components/OpsCenterPage";
import { CopilotPage } from "./components/CopilotPage";

type Tab = "pricing" | "adjustments" | "channels" | "competitors" | "ops" | "copilot";

export function App() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("pricing");

  return (
    <div data-testid="app-shell">
      <header className="header">
        <h1>{t("appTitle")}</h1>
        <select
          aria-label="language"
          value={i18n.language}
          onChange={(e) => void i18n.changeLanguage(e.target.value)}
        >
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
          <option value="es-MX">Español (MX)</option>
        </select>
      </header>
      <nav className="subnav">
        <button
          type="button"
          className={tab === "pricing" ? "active" : ""}
          onClick={() => setTab("pricing")}
        >
          {t("navPricing")}
        </button>
        <button
          type="button"
          className={tab === "adjustments" ? "active" : ""}
          onClick={() => setTab("adjustments")}
        >
          {t("navAdjustments")}
        </button>
        <button
          type="button"
          className={tab === "channels" ? "active" : ""}
          onClick={() => setTab("channels")}
          data-testid="nav-channels"
        >
          {t("navChannels")}
        </button>
        <button
          type="button"
          className={tab === "competitors" ? "active" : ""}
          onClick={() => setTab("competitors")}
        >
          {t("navCompetitors")}
        </button>
        <button
          type="button"
          className={tab === "ops" ? "active" : ""}
          onClick={() => setTab("ops")}
        >
          {t("navOps")}
        </button>
        <button
          type="button"
          className={tab === "copilot" ? "active" : ""}
          onClick={() => setTab("copilot")}
        >
          {t("navCopilot")}
        </button>
      </nav>
      {tab === "pricing" ? (
        <PricingPage />
      ) : tab === "adjustments" ? (
        <AdjustmentBatchesPage />
      ) : tab === "channels" ? (
        <ChannelsPage />
      ) : tab === "competitors" ? (
        <CompetitorsPage />
      ) : tab === "ops" ? (
        <OpsCenterPage />
      ) : (
        <CopilotPage />
      )}
    </div>
  );
}
