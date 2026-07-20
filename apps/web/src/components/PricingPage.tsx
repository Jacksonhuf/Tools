import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchPricingContext,
  publishPrice,
  simulatePricing,
  type Channel,
} from "../api/client";
import { WaterfallChart } from "./WaterfallChart";

type PricingMode = "cost" | "competitive_with_floor";

interface SimulateResult {
  publish_price_mxn: number;
  publish_price: { formatted: string };
  waterfall: Array<{ layer_id: string; amount_mxn: number }>;
  guards: string[];
}

export function PricingPage() {
  const { t, i18n } = useTranslation();
  const [channel, setChannel] = useState<Channel>("MERCADO_LIBRE");
  const [mode, setMode] = useState<PricingMode>("cost");
  const [margin, setMargin] = useState(20);
  const [competitorPrice, setCompetitorPrice] = useState(1400);
  const [context, setContext] = useState<Awaited<
    ReturnType<typeof fetchPricingContext>
  > | null>(null);
  const [simulation, setSimulation] = useState<SimulateResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language;

  const loadContext = useCallback(async () => {
    setError(null);
    try {
      const ctx = await fetchPricingContext(locale, channel);
      setContext(ctx);
    } catch (e) {
      setError(String(e));
    }
  }, [locale, channel]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const runSimulate = async () => {
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        channel,
        pricing_mode: mode,
      };
      if (mode === "cost") {
        body.target_margin_pct = margin;
      } else {
        body.competitor_price_mxn = competitorPrice;
      }
      const result = await simulatePricing(locale, body);
      setSimulation(result as SimulateResult);
    } catch (e) {
      setError(String(e));
    }
  };

  const runPublish = async () => {
    if (!simulation) return;
    setMessage(null);
    const { ok, json } = await publishPrice(
      locale,
      simulation.publish_price_mxn
    );
    if (ok) {
      setMessage(`${t("publishOk")}: ${json.version_id}`);
      await loadContext();
    } else {
      setMessage(`${t("publishFail")}: ${(json.guards as string[])?.join(", ")}`);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "es-MX" ? "es-MX" : locale === "zh-CN" ? "zh-CN" : "en-US", {
      style: "currency",
      currency: "MXN",
    }).format(n);

  return (
    <div className="page">
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

      {error && <p className="error">{error}</p>}

      {context && (
        <section className="card">
          <h2>{context.sku.name}</h2>
          <p>
            {t("landedCost")}: {context.sku.landed_cost.formatted}
          </p>
          <p>
            {t("activePrice")}:{" "}
            {context.versions.active?.publish_price?.formatted ?? "—"}
          </p>
          <p>
            {t("floorMl")}: {context.floors.mercado_libre.formatted} ·{" "}
            {t("floorAmazon")}: {context.floors.amazon_mx.formatted}
          </p>
        </section>
      )}

      <section className="card controls">
        <label>
          {t("channel")}
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
          >
            <option value="MERCADO_LIBRE">{t("mercadoLibre")}</option>
            <option value="AMAZON_MX">{t("amazonMx")}</option>
          </select>
        </label>
        <label>
          {t("pricingMode")}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PricingMode)}
          >
            <option value="cost">{t("modeCost")}</option>
            <option value="competitive_with_floor">{t("modeCompetitive")}</option>
          </select>
        </label>
        {mode === "cost" ? (
          <label>
            {t("targetMargin")}: {margin}%
            <input
              type="range"
              min={5}
              max={40}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </label>
        ) : (
          <label>
            {t("competitorPrice")}
            <input
              type="number"
              value={competitorPrice}
              onChange={(e) => setCompetitorPrice(Number(e.target.value))}
            />
          </label>
        )}
        <button type="button" onClick={() => void runSimulate()}>
          {t("simulate")}
        </button>
      </section>

      {simulation && (
        <section className="card">
          <h2>{t("waterfall")}</h2>
          <p className="highlight">{simulation.publish_price.formatted}</p>
          <WaterfallChart
            rows={simulation.waterfall}
            formatAmount={fmt}
          />
          <h3>{t("guards")}</h3>
          {simulation.guards.length === 0 ? (
            <p>{t("noGuards")}</p>
          ) : (
            <ul>
              {simulation.guards.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          <button type="button" className="primary" onClick={() => void runPublish()}>
            {t("publish")}
          </button>
        </section>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}
