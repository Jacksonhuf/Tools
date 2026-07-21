import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchPricingContext,
  fetchSkus,
  patchSkuLandedCost,
  publishChannelPrice,
  publishPrice,
  simulatePricing,
  type Channel,
} from "../api/client";
import { ChannelPricingColumn, type ChannelSimulation } from "./ChannelPricingColumn";

type PricingMode = "cost" | "competitive_with_floor";

const CHANNELS: Channel[] = ["MERCADO_LIBRE", "AMAZON_MX"];

export function PricingPage() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<PricingMode>("cost");
  const [margin, setMargin] = useState(20);
  const [competitorMl, setCompetitorMl] = useState(1400);
  const [competitorAmz, setCompetitorAmz] = useState(1350);
  const [landedEdit, setLandedEdit] = useState(1000);
  const [contextByChannel, setContextByChannel] = useState<
    Record<Channel, Awaited<ReturnType<typeof fetchPricingContext>> | null>
  >({ MERCADO_LIBRE: null, AMAZON_MX: null });
  const [simByChannel, setSimByChannel] = useState<
    Record<Channel, ChannelSimulation | null>
  >({ MERCADO_LIBRE: null, AMAZON_MX: null });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language;

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [ml, amz, skuList] = await Promise.all([
        fetchPricingContext(locale, "MERCADO_LIBRE"),
        fetchPricingContext(locale, "AMAZON_MX"),
        fetchSkus(locale),
      ]);
      setContextByChannel({ MERCADO_LIBRE: ml, AMAZON_MX: amz });
      const first = skuList.items[0];
      if (first) setLandedEdit(first.landed_cost_mxn);
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runSimulateAll = async () => {
    setError(null);
    setMessage(null);
    setSimByChannel({ MERCADO_LIBRE: null, AMAZON_MX: null });
    try {
      const results = await Promise.all(
        CHANNELS.map(async (channel) => {
          const body: Record<string, unknown> = {
            channel,
            pricing_mode: mode,
          };
          if (mode === "cost") {
            body.target_margin_pct = margin;
          } else {
            body.competitor_price_mxn =
              channel === "MERCADO_LIBRE" ? competitorMl : competitorAmz;
          }
          return simulatePricing(locale, body) as Promise<ChannelSimulation>;
        })
      );
      setSimByChannel({
        MERCADO_LIBRE: results[0],
        AMAZON_MX: results[1],
      });
    } catch (e) {
      setError(String(e));
    }
  };

  const syncToChannel = async (channel: Channel) => {
    setError(null);
    setMessage(null);
    try {
      const { ok, json } = await publishChannelPrice(locale, channel, {
        retry_on_step: true,
      });
      if (ok && json.publish_status === "published") {
        const retried =
          "retried" in json && json.retried ? ` (${t("channelPublishRetried")})` : "";
        setMessage(
          `${t("channelPublishOk")}: ${json.channel_price_mxn} MXN${retried}`
        );
      } else if (!ok && json.publish_status === "failed") {
        setError(`${t("channelPublishFail")}: ${json.error_code}`);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const saveLanded = async () => {
    setError(null);
    try {
      await patchSkuLandedCost(locale, "demo-sku-001", landedEdit);
      await loadAll();
      setMessage(t("landedSaved"));
    } catch (e) {
      setError(String(e));
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(
      locale === "es-MX" ? "es-MX" : locale === "zh-CN" ? "zh-CN" : "en-US",
      { style: "currency", currency: "MXN" }
    ).format(n);

  const mlCtx = contextByChannel.MERCADO_LIBRE;
  const amzCtx = contextByChannel.AMAZON_MX;

  return (
    <div className="page page-wide">
      {error && <p className="error">{error}</p>}

      {mlCtx && (
        <section className="card">
          <h2>{mlCtx.sku.name}</h2>
          <label className="inline-edit">
            {t("landedCost")} (MXN)
            <input
              type="number"
              value={landedEdit}
              onChange={(e) => setLandedEdit(Number(e.target.value))}
            />
            <button type="button" onClick={() => void saveLanded()}>
              {t("saveLanded")}
            </button>
          </label>
        </section>
      )}

      <section className="card controls">
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
          <div className="competitor-inputs">
            <label>
              {t("competitorPrice")} (ML)
              <input
                type="number"
                value={competitorMl}
                onChange={(e) => setCompetitorMl(Number(e.target.value))}
              />
            </label>
            <label>
              {t("competitorPrice")} (Amazon)
              <input
                type="number"
                value={competitorAmz}
                onChange={(e) => setCompetitorAmz(Number(e.target.value))}
              />
            </label>
          </div>
        )}
        <button type="button" onClick={() => void runSimulateAll()}>
          {t("simulateBoth")}
        </button>
      </section>

      <div className="dual-channel" data-testid="dual-channel-grid">
        {mlCtx && (
          <section className="card channel-card">
            <ChannelPricingColumn
              channel="MERCADO_LIBRE"
              title={t("mercadoLibre")}
              context={mlCtx}
              simulation={simByChannel.MERCADO_LIBRE}
              formatAmount={fmt}
              activeLabel={t("activePrice")}
              floorLabel={t("floorMl")}
              guardsLabel={t("guards")}
              noGuardsLabel={t("noGuards")}
              publishLabel={t("publish")}
              syncToChannelLabel={t("syncToChannel")}
              onSyncToChannel={() => void syncToChannel("MERCADO_LIBRE")}
              onPublish={() => {
                const sim = simByChannel.MERCADO_LIBRE;
                if (!sim) return;
                void publishPrice(locale, "MERCADO_LIBRE", sim.publish_price_mxn).then(
                  async ({ ok, json }) => {
                    setMessage(
                      ok
                        ? `${t("publishOk")}: ${json.version_id}`
                        : `${t("publishFail")}`
                    );
                    await loadAll();
                  }
                );
              }}
            />
          </section>
        )}
        {amzCtx && (
          <section className="card channel-card">
            <ChannelPricingColumn
              channel="AMAZON_MX"
              title={t("amazonMx")}
              context={amzCtx}
              simulation={simByChannel.AMAZON_MX}
              formatAmount={fmt}
              activeLabel={t("activePrice")}
              floorLabel={t("floorAmazon")}
              guardsLabel={t("guards")}
              noGuardsLabel={t("noGuards")}
              publishLabel={t("publish")}
              syncToChannelLabel={t("syncToChannel")}
              onSyncToChannel={() => void syncToChannel("AMAZON_MX")}
              onPublish={() => {
                const sim = simByChannel.AMAZON_MX;
                if (!sim) return;
                void publishPrice(locale, "AMAZON_MX", sim.publish_price_mxn).then(
                  async ({ ok, json }) => {
                    setMessage(
                      ok
                        ? `${t("publishOk")}: ${json.version_id}`
                        : `${t("publishFail")}`
                    );
                    await loadAll();
                  }
                );
              }}
            />
          </section>
        )}
      </div>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
