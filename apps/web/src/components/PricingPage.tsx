import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyAdjustmentPricesCsv,
  applyLandedFromCostSheet,
  createCostSheetRow,
  downloadCostSheetsCsv,
  downloadCostSheetCsv,
  downloadSkusCatalogCsv,
  downloadSkuCatalogCsv,
  downloadCrossChannelGuardCsv,
  downloadPricingSnapshotCsv,
  downloadPricingContextCsv,
  fetchCostSheets,
  fetchCrossChannelGuard,
  fetchPricingContext,
  fetchSkus,
  patchSkuLandedCost,
  downloadWaterfallExportCsv,
  publishChannelPrice,
  publishPrice,
  simulatePricing,
  type Channel,
  type CrossChannelGuardResponse,
  type CostSheetRow,
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
  const [crossChannelWarning, setCrossChannelWarning] = useState<
    CrossChannelGuardResponse["warning"]
  >(null);
  const [costSheets, setCostSheets] = useState<CostSheetRow[]>([]);
  const [batchNo, setBatchNo] = useState("BATCH-DEMO-01");
  const [cogsAmount, setCogsAmount] = useState(1000);

  const locale = i18n.language;

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [ml, amz, skuList, xch, sheets] = await Promise.all([
        fetchPricingContext(locale, "MERCADO_LIBRE"),
        fetchPricingContext(locale, "AMAZON_MX"),
        fetchSkus(locale),
        fetchCrossChannelGuard(locale),
        fetchCostSheets(locale, "demo-sku-001"),
      ]);
      setContextByChannel({ MERCADO_LIBRE: ml, AMAZON_MX: amz });
      setCrossChannelWarning(xch.warning);
      setCostSheets(sheets.items);
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

  const addCostSheet = async () => {
    setError(null);
    try {
      await createCostSheetRow(locale, "demo-sku-001", {
        batch_no: batchNo,
        cogs_amount: cogsAmount,
        cogs_currency: "MXN",
      });
      await loadAll();
      setMessage(t("costSheetCreated"));
    } catch (e) {
      setError(String(e));
    }
  };

  const applySheetLanded = async () => {
    const latest = costSheets[0];
    if (!latest) {
      setError(t("costSheetEmpty"));
      return;
    }
    setError(null);
    try {
      const r = await applyLandedFromCostSheet(
        locale,
        "demo-sku-001",
        latest.id
      );
      setLandedEdit(r.sku.landed_cost_mxn);
      await loadAll();
      setMessage(
        t("costSheetLandedApplied", { landed: r.sku.landed_cost_mxn })
      );
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
      {message && <p className="message">{message}</p>}
      <div className="shop-actions">
        <button
          type="button"
          data-testid="pricing-skus-export"
          onClick={() =>
            void downloadSkusCatalogCsv(locale).then(() =>
              setMessage(t("skusCatalogExportDone"))
            )
          }
        >
          {t("skusCatalogExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-sku-export"
          onClick={() =>
            void downloadSkuCatalogCsv(locale, "demo-sku-001").then(() =>
              setMessage(t("skuCatalogExportDone"))
            )
          }
        >
          {t("skuCatalogExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-snapshot-export"
          onClick={() =>
            void downloadPricingSnapshotCsv(locale, "demo-sku-001").then(() =>
              setMessage(t("pricingSnapshotExportDone"))
            )
          }
        >
          {t("pricingSnapshotExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-context-export-ml"
          onClick={() =>
            void downloadPricingContextCsv(locale, "MERCADO_LIBRE").then(() =>
              setMessage(t("pricingContextExportDone"))
            )
          }
        >
          {t("pricingContextExportCsv")}
        </button>
        <button
          type="button"
          data-testid="cross-channel-guard-export"
          onClick={() =>
            void downloadCrossChannelGuardCsv(locale).then(() =>
              setMessage(t("crossChannelGuardExportDone"))
            )
          }
        >
          {t("crossChannelGuardExportCsv")}
        </button>
      </div>
      {crossChannelWarning && (
        <p className="error" data-testid="cross-channel-guard-banner">
          {t("crossChannelSpreadWarning", {
            spread: crossChannelWarning.spread_pct,
            max: crossChannelWarning.max_spread_pct,
          })}
        </p>
      )}

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

      <section className="card" data-testid="cost-sheets-panel">
        <h2>{t("costSheetsTitle")}</h2>
        <p className="hint">{t("costSheetsHint")}</p>
        <label>
          {t("costSheetBatch")}
          <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
        </label>
        <label>
          COGS (MXN)
          <input
            type="number"
            value={cogsAmount}
            onChange={(e) => setCogsAmount(Number(e.target.value))}
          />
        </label>
        <button type="button" data-testid="cost-sheet-add" onClick={() => void addCostSheet()}>
          {t("costSheetAdd")}
        </button>
        <button
          type="button"
          data-testid="cost-sheet-apply-landed"
          onClick={() => void applySheetLanded()}
        >
          {t("costSheetApplyLanded")}
        </button>
        <button
          type="button"
          data-testid="cost-sheet-export"
          onClick={() =>
            void downloadCostSheetsCsv(locale, "demo-sku-001").then(() =>
              setMessage(t("costSheetExportDone"))
            )
          }
        >
          {t("costSheetExportCsv")}
        </button>
        <button
          type="button"
          data-testid="cost-sheet-row-export"
          disabled={!costSheets[0]}
          onClick={() => {
            const sheet = costSheets[0];
            if (!sheet) return;
            void downloadCostSheetCsv(locale, "demo-sku-001", sheet.id).then(() =>
              setMessage(t("costSheetRowExportDone"))
            );
          }}
        >
          {t("costSheetRowExportCsv")}
        </button>
        <ul>
          {costSheets.slice(0, 3).map((s) => (
            <li key={s.id}>
              <code>{s.batch_no}</code>: {s.cogs_amount} {s.cogs_currency}
            </li>
          ))}
        </ul>
      </section>

      <section className="card controls">
        <button
          type="button"
          data-testid="pricing-waterfall-export"
          onClick={() =>
            void downloadWaterfallExportCsv(locale, {
              channel: "MERCADO_LIBRE",
              pricing_mode: mode,
              target_margin_pct: mode === "cost" ? margin : undefined,
              competitor_price_mxn:
                mode === "competitive_with_floor" ? competitorMl : undefined,
            }).then(() => setMessage(t("waterfallExportDone")))
          }
        >
          {t("waterfallExportCsv")}
        </button>
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
        <button type="button" data-testid="simulate-both" onClick={() => void runSimulateAll()}>
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
