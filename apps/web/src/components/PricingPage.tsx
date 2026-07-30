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
  downloadDynamicRepricingRuleCsv,
  downloadLatestRepricingBatchJobCsv,
  downloadCategoryRuleTemplateCsv,
  createCopilotSession,
  downloadCopilotSessionCsv,
  DEMO_SKU,
  downloadLatestQueuePriceVersionCsv,
  downloadVersionBackupCsv,
  downloadP5ReadinessCsv,
  downloadP3ReadinessCsv,
  downloadP4ReadinessCsv,
  downloadSharedFeeTemplateCsv,
  downloadTenantSharedFeeTemplatesCsv,
  downloadListingCsv,
  downloadTariffHsRateCsv,
  downloadFxRateCsv,
  downloadFirstCompetitorOfferCsv,
  downloadFirstReconciliationAlertCsv,
  downloadReconciliationAlertsDirectCsv,
  downloadListingSyncOpsStatusCsv,
  downloadListingSyncJobsForListingCsv,
  downloadAgentToolsCsv,
  downloadRepricingBatchJobsSummaryCsv,
  downloadListingIngestStatusCsv,
  downloadFeatureFlagsCsv,
  downloadLatestListingSyncJobCsv,
  downloadLatestDigestQueuedJobCsv,
  downloadFirstWorkerHeartbeatCsv,
  downloadLatestDigestDispatchCsv,
  downloadFirstChannelSandboxEventCsv,
  downloadFirstDigestDeadLetterJobCsv,
  downloadFirstAgentToolAuditRowCsv,
  downloadFirstPriceObservationCsv,
  downloadLatestRepricingEventCsv,
  downloadLatestAdjustmentBatchIndexCsv,
  downloadLatestAgentDigestDateCsv,
  downloadPricingSnapshotRowCsv,
  downloadCrossChannelDashboardRowCsv,
  downloadLatestCompetitorCurvePointCsv,
  downloadFirstAgentToolRowCsv,
  downloadFirstAgentReadinessCheckCsv,
  downloadAgentReadinessCsv,
  downloadFirstAgentMilestoneCsv,
  downloadAgentMilestonesCsv,
  downloadFirstProductReadinessCheckCsv,
  downloadProductReadinessCsv,
  downloadCompetitorAnchorCsv,
  downloadFirstFeatureFlagCsv,
  downloadNotificationTemplatesCsv,
  downloadFirstNotificationTemplateCsv,
  downloadReconciliationAlertCsv,
  downloadPricingContextCsv,
  downloadDigestQueuedJobsSummaryCsv,
  downloadChannelAdapterStatusCsv,
  downloadRuleCompilerStatusCsv,
  downloadAuthStatusCsv,
  downloadChannelSandboxStatusCsv,
  downloadDigestDeadLetterSummaryCsv,
  downloadListingSyncScheduleCsv,
  downloadAdjustmentApprovalPolicyCsv,
  downloadOpsWorkersStatusSummaryCsv,
  downloadDigestScheduleCsv,
  downloadSkuRepricingQueueCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadReconciliationAlertsReportCsv,
  downloadShopCsv,
  downloadI18nGlossaryCsv,
  downloadI18nGlossaryTermCsv,
  fetchI18nGlossary,
  fetchCostSheets,
  fetchCompetitorCurve,
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
  LISTING_BY_CHANNEL,
} from "../api/client";
import { ChannelPricingColumn, type ChannelSimulation } from "./ChannelPricingColumn";
import type { CompetitorCurvePoint } from "./CompetitorCurveMini";
import { PageIntent } from "@/components/patterns/PageIntent";
import { KpiStrip } from "@/components/patterns/KpiStrip";
import { KpiMetric } from "@/components/primitives/KpiMetric";
import { AdvancedSection } from "@/components/patterns/AdvancedSection";
import { ExportHub } from "@/components/patterns/ExportHub";
import { FormActions, FormField, FormRow, FormSection } from "@/components/patterns/FormField";
import { PricingControlsPanel } from "@/components/patterns/PricingControlsPanel";
import { Surface } from "@/components/primitives/Surface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [curveByChannel, setCurveByChannel] = useState<
    Record<Channel, CompetitorCurvePoint[]>
  >({ MERCADO_LIBRE: [], AMAZON_MX: [] });
  const [simByChannel, setSimByChannel] = useState<
    Record<Channel, ChannelSimulation | null>
  >({ MERCADO_LIBRE: null, AMAZON_MX: null });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crossChannelWarning, setCrossChannelWarning] = useState<
    CrossChannelGuardResponse["warning"]
  >(null);
  const [costSheets, setCostSheets] = useState<CostSheetRow[]>([]);
  const [skus, setSkus] = useState<
    Array<{ id: string; sku_code: string; name: string; landed_cost_mxn: number }>
  >([]);
  const [selectedSkuId, setSelectedSkuId] = useState(DEMO_SKU);
  const [batchNo, setBatchNo] = useState("BATCH-DEMO-01");
  const [cogsAmount, setCogsAmount] = useState(1000);
  const [layerLabels, setLayerLabels] = useState<Record<string, string>>({});

  const locale = i18n.language;

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [ml, amz, skuList, xch, sheets, glossary, mlCurve, amzCurve] =
        await Promise.all([
        fetchPricingContext(locale, "MERCADO_LIBRE"),
        fetchPricingContext(locale, "AMAZON_MX"),
        fetchSkus(locale),
        fetchCrossChannelGuard(locale),
        fetchCostSheets(locale, selectedSkuId),
        fetchI18nGlossary(locale),
        fetchCompetitorCurve(locale, LISTING_BY_CHANNEL.MERCADO_LIBRE, "7d"),
        fetchCompetitorCurve(locale, LISTING_BY_CHANNEL.AMAZON_MX, "7d"),
      ]);
      setContextByChannel({ MERCADO_LIBRE: ml, AMAZON_MX: amz });
      setCurveByChannel({
        MERCADO_LIBRE: mlCurve.points,
        AMAZON_MX: amzCurve.points,
      });
      setCrossChannelWarning(xch.warning);
      setCostSheets(sheets.items);
      setSkus(skuList.items);
      setSelectedSkuId((prev) => {
        if (prev && skuList.items.some((s) => s.id === prev)) return prev;
        return skuList.items[0]?.id ?? DEMO_SKU;
      });
      const first = skuList.items.find((s) => s.id === selectedSkuId) ?? skuList.items[0];
      if (first) setLandedEdit(first.landed_cost_mxn);
      setLayerLabels(
        Object.fromEntries(glossary.terms.map((term) => [term.key, term.label]))
      );
    } catch (e) {
      setError(String(e));
    }
  }, [locale, selectedSkuId]);

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
      await patchSkuLandedCost(locale, selectedSkuId, landedEdit);
      await loadAll();
      setMessage(t("landedSaved"));
    } catch (e) {
      setError(String(e));
    }
  };

  const addCostSheet = async () => {
    setError(null);
    try {
      await createCostSheetRow(locale, selectedSkuId, {
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
        selectedSkuId,
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
  const mlActive = mlCtx?.versions.active?.publish_price?.formatted ?? "—";
  const amzActive = amzCtx?.versions.active?.publish_price?.formatted ?? "—";
  const mlSuggested =
    mlCtx?.versions.suggested?.publish_price?.formatted ?? t("noSuggested");
  const amzSuggested =
    amzCtx?.versions.suggested?.publish_price?.formatted ?? t("noSuggested");
  const mlSimulated =
    simByChannel.MERCADO_LIBRE?.publish_price.formatted ?? t("pricingKpiNotRun");
  const guardKpi = crossChannelWarning
    ? `${crossChannelWarning.spread_pct}%`
    : t("pricingKpiGuardOk");

  return (
    <div className="space-y-4">
      <PageIntent
        title={t("navPricing")}
        description={t("pricingWorkbenchHint")}
        actions={
          <Button
            type="button"
            data-testid="simulate-both"
            shortcut="⌘↵"
            onClick={() => void runSimulateAll()}
          >
            {t("simulateBoth")}
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {crossChannelWarning && (
        <Alert variant="destructive" className="mb-4" data-testid="cross-channel-guard-banner">
          <AlertDescription>
            {t("crossChannelSpreadWarning", {
              spread: crossChannelWarning.spread_pct,
              max: crossChannelWarning.max_spread_pct,
            })}
          </AlertDescription>
        </Alert>
      )}

      <KpiStrip>
        <KpiMetric label={t("pricingKpiMl")} value={mlActive} />
        <KpiMetric label={t("pricingKpiAmz")} value={amzActive} />
        <KpiMetric label={t("pricingKpiMlSuggested")} value={mlSuggested} />
        <KpiMetric label={t("pricingKpiAmzSuggested")} value={amzSuggested} />
        <KpiMetric label={t("pricingKpiSimulated")} value={mlSimulated} />
        <KpiMetric
          label={t("pricingKpiGuard")}
          value={guardKpi}
          trendDirection={crossChannelWarning ? "down" : "up"}
        />
      </KpiStrip>

      <PricingControlsPanel
        mode={mode}
        onModeChange={setMode}
        margin={margin}
        onMarginChange={setMargin}
        competitorMl={competitorMl}
        onCompetitorMlChange={setCompetitorMl}
        competitorAmz={competitorAmz}
        onCompetitorAmzChange={setCompetitorAmz}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="dual-channel-grid">
        {mlCtx && (
          <Surface variant="elevated" padding="md" className="channel-card">
            <ChannelPricingColumn
              channel="MERCADO_LIBRE"
              title={t("mercadoLibre")}
              context={mlCtx}
              simulation={simByChannel.MERCADO_LIBRE}
              formatAmount={fmt}
              activeLabel={t("activePrice")}
              suggestedLabel={t("suggestedPrice")}
              noSuggestedLabel={t("noSuggested")}
              suggestedDeltaLabel={t("suggestedDelta")}
              floorLabel={t("floorMl")}
              guardsLabel={t("guards")}
              noGuardsLabel={t("noGuards")}
              competitorCurveLabel={t("competitorCurveMini")}
              curvePoints={curveByChannel.MERCADO_LIBRE}
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
              layerLabels={layerLabels}
            />
          </Surface>
        )}
        {amzCtx && (
          <Surface variant="elevated" padding="md" className="channel-card">
            <ChannelPricingColumn
              channel="AMAZON_MX"
              title={t("amazonMx")}
              context={amzCtx}
              simulation={simByChannel.AMAZON_MX}
              formatAmount={fmt}
              activeLabel={t("activePrice")}
              suggestedLabel={t("suggestedPrice")}
              noSuggestedLabel={t("noSuggested")}
              suggestedDeltaLabel={t("suggestedDelta")}
              floorLabel={t("floorAmazon")}
              guardsLabel={t("guards")}
              noGuardsLabel={t("noGuards")}
              competitorCurveLabel={t("competitorCurveMini")}
              curvePoints={curveByChannel.AMAZON_MX}
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
              layerLabels={layerLabels}
            />
          </Surface>
        )}
      </div>

      <AdvancedSection title={t("advancedSection")} description={t("advancedSectionHint")}>
      {mlCtx && (
        <FormSection title={mlCtx.sku.name}>
          <FormRow cols={2}>
            <FormField label={`${t("landedCost")} (MXN)`} htmlFor="pricing-landed-edit">
              <Input
                id="pricing-landed-edit"
                type="number"
                value={landedEdit}
                onChange={(e) => setLandedEdit(Number(e.target.value))}
              />
            </FormField>
          </FormRow>
          <FormActions>
            <Button type="button" onClick={() => void saveLanded()}>
              {t("saveLanded")}
            </Button>
          </FormActions>
        </FormSection>
      )}
        <FormSection
          title={t("costSheetsTitle")}
          description={t("costSheetsHint")}
          testId="cost-sheets-panel"
        >
        <FormField label={t("sku")}>
          <Select value={selectedSkuId} onValueChange={setSelectedSkuId}>
            <SelectTrigger data-testid="pricing-sku-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {skus.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.sku_code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormRow cols={2}>
          <FormField label={t("costSheetBatch")}>
            <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
          </FormField>
          <FormField label="COGS (MXN)">
            <Input
              type="number"
              value={cogsAmount}
              onChange={(e) => setCogsAmount(Number(e.target.value))}
            />
          </FormField>
        </FormRow>
        <FormActions>
        <Button type="button" data-testid="cost-sheet-add" onClick={() => void addCostSheet()}>
          {t("costSheetAdd")}
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="cost-sheet-apply-landed"
          onClick={() => void applySheetLanded()}
        >
          {t("costSheetApplyLanded")}
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="cost-sheet-export"
          onClick={() =>
            void downloadCostSheetsCsv(locale, selectedSkuId).then(() =>
              setMessage(t("costSheetExportDone"))
            )
          }
        >
          {t("costSheetExportCsv")}
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="cost-sheet-row-export"
          disabled={!costSheets[0]}
          onClick={() => {
            const sheet = costSheets[0];
            if (!sheet) return;
            void downloadCostSheetCsv(locale, selectedSkuId, sheet.id).then(() =>
              setMessage(t("costSheetRowExportDone"))
            );
          }}
        >
          {t("costSheetRowExportCsv")}
        </Button>
        </FormActions>
        <ul className="space-y-1 text-sm">
          {costSheets.slice(0, 3).map((s) => (
            <li key={s.id}>
              <code>{s.batch_no}</code>: {s.cogs_amount} {s.cogs_currency}
            </li>
          ))}
        </ul>
      </FormSection>

{layerLabels.LANDED && (
        <FormSection title={t("glossaryTitle")} testId="pricing-glossary-hint">
          <p className="text-sm text-muted-foreground">{t("glossaryHint")}</p>
          <ul className="space-y-1 text-sm">
            {["LANDED", "LIST_PRICE", "IVA_DISPLAY"].map((key) =>
              layerLabels[key] ? (
                <li key={key}>
                  <code>{key}</code> — {layerLabels[key]}
                </li>
              ) : null
            )}
          </ul>
        </FormSection>
      )}


        <ExportHub title={t("exportActions")} description={t("exportHubHint")}>
      <div className="flex flex-wrap gap-2">
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
        <button
          type="button"
          data-testid="i18n-glossary-export"
          onClick={() =>
            void downloadI18nGlossaryCsv(locale).then(() =>
              setMessage(t("glossaryExportDone"))
            )
          }
        >
          {t("glossaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="i18n-glossary-term-export"
          onClick={() =>
            void downloadI18nGlossaryTermCsv(locale, "LANDED").then(() =>
              setMessage(t("glossaryTermExportDone"))
            )
          }
        >
          {t("glossaryTermExportCsv")}
        </button>
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
            void downloadSkuCatalogCsv(locale, selectedSkuId).then(() =>
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
            void downloadPricingSnapshotCsv(locale, selectedSkuId).then(() =>
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
        <button
          type="button"
          data-testid="pricing-dynamic-repricing-rule-export"
          onClick={() =>
            void downloadDynamicRepricingRuleCsv(locale, "listing-ml-001").then(
              () => setMessage(t("dynamicRepricingRuleExportDone"))
            )
          }
        >
          {t("dynamicRepricingRuleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-repricing-batch-job-export"
          onClick={() =>
            void downloadLatestRepricingBatchJobCsv(locale)
              .then(() => setMessage(t("pricingRepricingBatchJobExportDone")))
              .catch(() => setMessage(t("pricingRepricingBatchJobExportEmpty")))
          }
        >
          {t("pricingRepricingBatchJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-category-rule-template-export"
          onClick={() =>
            void downloadCategoryRuleTemplateCsv(
              locale,
              "cat-electronics-mx"
            ).then(() => setMessage(t("pricingCategoryRuleTemplateExportDone")))
          }
        >
          {t("pricingCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-copilot-session-export"
          onClick={() =>
            void createCopilotSession(
              locale,
              "listing-ml-001",
              DEMO_SKU,
              "MERCADO_LIBRE"
            )
              .then((s) => downloadCopilotSessionCsv(locale, s.session_id))
              .then(() => setMessage(t("pricingCopilotSessionExportDone")))
          }
        >
          {t("pricingCopilotSessionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-price-version-export"
          onClick={() =>
            void downloadLatestQueuePriceVersionCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("pricingPriceVersionExportDone")))
              .catch(() => setMessage(t("pricingPriceVersionExportEmpty")))
          }
        >
          {t("pricingPriceVersionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-version-backup-csv"
          onClick={() =>
            void downloadVersionBackupCsv(locale).then(() =>
              setMessage(t("pricingVersionBackupCsvDone"))
            )
          }
        >
          {t("pricingVersionBackupCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-p5-readiness-export"
          onClick={() =>
            void downloadP5ReadinessCsv(locale).then(() =>
              setMessage(t("pricingP5ReadinessExportDone"))
            )
          }
        >
          {t("pricingP5ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-p3-readiness-export"
          onClick={() =>
            void downloadP3ReadinessCsv(locale).then(() =>
              setMessage(t("pricingP3ReadinessExportDone"))
            )
          }
        >
          {t("pricingP3ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-p4-readiness-export"
          onClick={() =>
            void downloadP4ReadinessCsv(locale).then(() =>
              setMessage(t("pricingP4ReadinessExportDone"))
            )
          }
        >
          {t("pricingP4ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-shared-fee-template-export"
          onClick={() =>
            void downloadSharedFeeTemplateCsv(
              locale,
              "fee-tpl-ml-electronics"
            ).then(() => setMessage(t("pricingSharedFeeTemplateExportDone")))
          }
        >
          {t("pricingSharedFeeTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-tenant-shared-fee-export"
          onClick={() =>
            void downloadTenantSharedFeeTemplatesCsv(locale, "tenant-demo").then(
              () => setMessage(t("pricingTenantSharedFeeTemplatesExportDone"))
            )
          }
        >
          {t("pricingTenantSharedFeeTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-listing-export"
          onClick={() =>
            void downloadListingCsv(locale, "listing-ml-001").then(() =>
              setMessage(t("pricingListingExportDone"))
            )
          }
        >
          {t("pricingListingExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-tariff-rate-export"
          onClick={() =>
            void downloadTariffHsRateCsv(locale, "HS-ELECTRONICS-MX").then(() =>
              setMessage(t("pricingTariffRateExportDone"))
            )
          }
        >
          {t("pricingTariffRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-fx-rate-export"
          onClick={() =>
            void downloadFxRateCsv(locale, "USD", "MXN").then(() =>
              setMessage(t("pricingFxRateExportDone"))
            )
          }
        >
          {t("pricingFxRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-competitor-offer-export"
          onClick={() =>
            void downloadFirstCompetitorOfferCsv(locale, "listing-ml-001")
              .then(() => setMessage(t("pricingCompetitorOfferExportDone")))
              .catch(() => setMessage(t("pricingCompetitorOfferExportEmpty")))
          }
        >
          {t("pricingCompetitorOfferExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-reconciliation-alert-export"
          onClick={() =>
            void downloadFirstReconciliationAlertCsv(locale)
              .then(() => setMessage(t("pricingReconciliationAlertExportDone")))
              .catch(() => setMessage(t("pricingReconciliationAlertExportEmpty")))
          }
        >
          {t("pricingReconciliationAlertExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-reconciliation-direct-export"
          onClick={() =>
            void downloadReconciliationAlertsDirectCsv(locale).then(() =>
              setMessage(t("pricingReconciliationDirectExportDone"))
            )
          }
        >
          {t("pricingReconciliationDirectExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-listing-sync-ops-export"
          onClick={() =>
            void downloadListingSyncOpsStatusCsv(locale).then(() =>
              setMessage(t("pricingListingSyncOpsExportDone"))
            )
          }
        >
          {t("pricingListingSyncOpsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-listing-sync-amz-export"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-amz-001"
            ).then(() => setMessage(t("pricingListingSyncAmzExportDone")))}
        >
          {t("pricingListingSyncAmzExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-tools-export"
          onClick={() =>
            void downloadAgentToolsCsv(locale).then(() =>
              setMessage(t("pricingAgentToolsExportDone"))
            )
          }
        >
          {t("pricingAgentToolsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-repricing-batch-summary-export"
          onClick={() =>
            void downloadRepricingBatchJobsSummaryCsv(locale).then(() =>
              setMessage(t("pricingRepricingBatchSummaryExportDone"))
            )
          }
        >
          {t("pricingRepricingBatchSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-listing-ingest-status-export"
          onClick={() =>
            void downloadListingIngestStatusCsv(locale, "listing-ml-001").then(
              () => setMessage(t("pricingListingIngestStatusExportDone"))
            )
          }
        >
          {t("pricingListingIngestStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-feature-flags-export"
          onClick={() =>
            void downloadFeatureFlagsCsv(locale).then(() =>
              setMessage(t("pricingFeatureFlagsExportDone"))
            )
          }
        >
          {t("pricingFeatureFlagsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-readiness-export"
          onClick={() =>
            void downloadAgentReadinessCsv(locale).then(() =>
              setMessage(t("pricingAgentReadinessExportDone"))
            )
          }
        >
          {t("pricingAgentReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-competitor-anchor-export"
          onClick={() =>
            void downloadCompetitorAnchorCsv(locale, "listing-ml-001").then(() =>
              setMessage(t("pricingCompetitorAnchorExportDone"))
            )
          }
        >
          {t("pricingCompetitorAnchorExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-product-readiness-export"
          onClick={() =>
            void downloadProductReadinessCsv(locale).then(() =>
              setMessage(t("pricingProductReadinessExportDone"))
            )
          }
        >
          {t("pricingProductReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-milestones-export"
          onClick={() =>
            void downloadAgentMilestonesCsv(locale).then(() =>
              setMessage(t("pricingAgentMilestonesExportDone"))
            )
          }
        >
          {t("pricingAgentMilestonesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-digest-jobs-summary-export"
          onClick={() =>
            void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
              setMessage(t("pricingDigestJobsSummaryExportDone"))
            )
          }
        >
          {t("pricingDigestJobsSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-channel-adapter-export"
          onClick={() =>
            void downloadChannelAdapterStatusCsv(locale).then(() =>
              setMessage(t("pricingChannelAdapterExportDone"))
            )
          }
        >
          {t("pricingChannelAdapterExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-rule-compiler-export"
          onClick={() =>
            void downloadRuleCompilerStatusCsv(locale).then(() =>
              setMessage(t("pricingRuleCompilerExportDone"))
            )
          }
        >
          {t("pricingRuleCompilerExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-auth-export"
          onClick={() =>
            void downloadAuthStatusCsv(locale).then(() =>
              setMessage(t("pricingAuthExportDone"))
            )
          }
        >
          {t("pricingAuthExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-channel-sandbox-status-export"
          onClick={() =>
            void downloadChannelSandboxStatusCsv(locale).then(() =>
              setMessage(t("pricingChannelSandboxStatusExportDone"))
            )
          }
        >
          {t("pricingChannelSandboxStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-digest-dlq-summary-export"
          onClick={() =>
            void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
              setMessage(t("pricingDigestDlqSummaryExportDone"))
            )
          }
        >
          {t("pricingDigestDlqSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-listing-sync-schedule-export"
          onClick={() =>
            void downloadListingSyncScheduleCsv(locale).then(() =>
              setMessage(t("pricingListingSyncScheduleExportDone"))
            )
          }
        >
          {t("pricingListingSyncScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-adjustment-approval-policy-export"
          onClick={() =>
            void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
              setMessage(t("pricingAdjustmentApprovalPolicyExportDone"))
            )
          }
        >
          {t("pricingAdjustmentApprovalPolicyExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-ops-workers-summary-export"
          onClick={() =>
            void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
              setMessage(t("pricingOpsWorkersSummaryExportDone"))
            )
          }
        >
          {t("pricingOpsWorkersSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-digest-schedule-export"
          onClick={() =>
            void downloadDigestScheduleCsv(locale).then(() =>
              setMessage(t("pricingDigestScheduleExportDone"))
            )
          }
        >
          {t("pricingDigestScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-repricing-queue-sku-export"
          onClick={() =>
            void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("pricingRepricingQueueSkuExportDone"))
            )
          }
        >
          {t("pricingRepricingQueueSkuExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-repricing-batch-shard-plan-export"
          onClick={() =>
            void downloadRepricingBatchShardPlanCsv(locale).then(() =>
              setMessage(t("pricingRepricingBatchShardPlanExportDone"))
            )
          }
        >
          {t("pricingRepricingBatchShardPlanExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-sku-category-template-export"
          onClick={() =>
            void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("pricingSkuCategoryRuleTemplateExportDone"))
            )
          }
        >
          {t("pricingSkuCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-reconciliation-report-export"
          onClick={() =>
            void downloadReconciliationAlertsReportCsv(locale).then(() =>
              setMessage(t("pricingReconciliationReportExportDone"))
            )
          }
        >
          {t("pricingReconciliationReportExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-shop-export"
          onClick={() =>
            void downloadShopCsv(locale, "shop-ml-demo").then(() =>
              setMessage(t("pricingShopExportDone"))
            )
          }
        >
          {t("pricingShopExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-listing-sync-job-export"
          onClick={() =>
            void downloadLatestListingSyncJobCsv(locale)
              .then(() => setMessage(t("pricingListingSyncJobExportDone")))
              .catch(() => setMessage(t("pricingListingSyncJobExportEmpty")))
          }
        >
          {t("pricingListingSyncJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-digest-queued-job-export"
          onClick={() =>
            void downloadLatestDigestQueuedJobCsv(locale)
              .then(() => setMessage(t("pricingDigestQueuedJobExportDone")))
              .catch(() => setMessage(t("pricingDigestQueuedJobExportEmpty")))
          }
        >
          {t("pricingDigestQueuedJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-worker-heartbeat-export"
          onClick={() =>
            void downloadFirstWorkerHeartbeatCsv(locale)
              .then(() => setMessage(t("pricingWorkerHeartbeatExportDone")))
              .catch(() => setMessage(t("pricingWorkerHeartbeatExportEmpty")))
          }
        >
          {t("pricingWorkerHeartbeatExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-digest-dispatch-export"
          onClick={() =>
            void downloadLatestDigestDispatchCsv(locale)
              .then(() => setMessage(t("pricingDigestDispatchExportDone")))
              .catch(() => setMessage(t("pricingDigestDispatchExportEmpty")))
          }
        >
          {t("pricingDigestDispatchExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-sandbox-event-export"
          onClick={() =>
            void downloadFirstChannelSandboxEventCsv(locale)
              .then(() => setMessage(t("pricingSandboxEventExportDone")))
              .catch(() => setMessage(t("pricingSandboxEventExportEmpty")))
          }
        >
          {t("pricingSandboxEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-digest-dead-letter-job-export"
          onClick={() =>
            void downloadFirstDigestDeadLetterJobCsv(locale)
              .then(() => setMessage(t("pricingDigestDeadLetterJobExportDone")))
              .catch(() => setMessage(t("pricingDigestDeadLetterJobExportEmpty")))
          }
        >
          {t("pricingDigestDeadLetterJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-tool-audit-row-export"
          onClick={() =>
            void downloadFirstAgentToolAuditRowCsv(locale)
              .then(() => setMessage(t("pricingAgentToolAuditRowExportDone")))
              .catch(() => setMessage(t("pricingAgentToolAuditRowExportEmpty")))
          }
        >
          {t("pricingAgentToolAuditRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-price-observation-export"
          onClick={() =>
            void downloadFirstPriceObservationCsv(locale, "listing-ml-001")
              .then(() => setMessage(t("pricingPriceObservationExportDone")))
              .catch(() => setMessage(t("pricingPriceObservationExportEmpty")))
          }
        >
          {t("pricingPriceObservationExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-repricing-event-export"
          onClick={() =>
            void downloadLatestRepricingEventCsv(locale, "listing-ml-001")
              .then(() => setMessage(t("pricingRepricingEventExportDone")))
              .catch(() => setMessage(t("pricingRepricingEventExportEmpty")))
          }
        >
          {t("pricingRepricingEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-adjustment-batch-index-export"
          onClick={() =>
            void downloadLatestAdjustmentBatchIndexCsv(locale)
              .then(() => setMessage(t("pricingAdjustmentBatchIndexExportDone")))
              .catch(() => setMessage(t("pricingAdjustmentBatchIndexExportEmpty")))
          }
        >
          {t("pricingAdjustmentBatchIndexExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-digest-date-export"
          onClick={() =>
            void downloadLatestAgentDigestDateCsv(locale)
              .then(() => setMessage(t("pricingAgentDigestDateExportDone")))
              .catch(() => setMessage(t("pricingAgentDigestDateExportEmpty")))
          }
        >
          {t("pricingAgentDigestDateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-snapshot-row-export"
          onClick={() =>
            void downloadPricingSnapshotRowCsv(
              locale,
              DEMO_SKU,
              "MERCADO_LIBRE"
            )
              .then(() => setMessage(t("pricingSnapshotRowExportDone")))
              .catch(() => setMessage(t("pricingSnapshotRowExportEmpty")))
          }
        >
          {t("pricingSnapshotRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-cross-channel-row-export"
          onClick={() =>
            void downloadCrossChannelDashboardRowCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("pricingCrossChannelRowExportDone")))
              .catch(() => setMessage(t("pricingCrossChannelRowExportEmpty")))
          }
        >
          {t("pricingCrossChannelRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-curve-point-export"
          onClick={() =>
            void downloadLatestCompetitorCurvePointCsv(locale, "listing-ml-001")
              .then(() => setMessage(t("pricingCurvePointExportDone")))
              .catch(() => setMessage(t("pricingCurvePointExportEmpty")))
          }
        >
          {t("pricingCurvePointExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-tool-row-export"
          onClick={() =>
            void downloadFirstAgentToolRowCsv(locale)
              .then(() => setMessage(t("pricingAgentToolRowExportDone")))
              .catch(() => setMessage(t("pricingAgentToolRowExportEmpty")))
          }
        >
          {t("pricingAgentToolRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-readiness-check-export"
          onClick={() =>
            void downloadFirstAgentReadinessCheckCsv(locale)
              .then(() => setMessage(t("pricingAgentReadinessCheckExportDone")))
              .catch(() => setMessage(t("pricingAgentReadinessCheckExportEmpty")))
          }
        >
          {t("pricingAgentReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-agent-milestone-export"
          onClick={() =>
            void downloadFirstAgentMilestoneCsv(locale)
              .then(() => setMessage(t("pricingAgentMilestoneExportDone")))
              .catch(() => setMessage(t("pricingAgentMilestoneExportEmpty")))
          }
        >
          {t("pricingAgentMilestoneExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-product-readiness-check-export"
          onClick={() =>
            void downloadFirstProductReadinessCheckCsv(locale)
              .then(() => setMessage(t("pricingProductReadinessCheckExportDone")))
              .catch(() => setMessage(t("pricingProductReadinessCheckExportEmpty")))
          }
        >
          {t("pricingProductReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-feature-flag-export"
          onClick={() =>
            void downloadFirstFeatureFlagCsv(locale)
              .then(() => setMessage(t("pricingFeatureFlagExportDone")))
              .catch(() => setMessage(t("pricingFeatureFlagExportEmpty")))
          }
        >
          {t("pricingFeatureFlagExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-notification-templates-export"
          onClick={() =>
            void downloadNotificationTemplatesCsv(locale)
              .then(() => setMessage(t("pricingNotificationTemplatesExportDone")))
              .catch(() => setMessage(t("pricingNotificationTemplatesExportEmpty")))
          }
        >
          {t("pricingNotificationTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="pricing-notification-template-export"
          onClick={() =>
            void downloadFirstNotificationTemplateCsv(locale)
              .then(() => setMessage(t("pricingNotificationTemplateExportDone")))
              .catch(() => setMessage(t("pricingNotificationTemplateExportEmpty")))
          }
        >
          {t("pricingNotificationTemplateExportCsv")}
        </button>
      </div>
        </ExportHub>
      </AdvancedSection>
    </div>
  );
}
