import type { TFunction } from "i18next";
import {
  DEMO_SKU,
  downloadAdjustmentApprovalPolicyCsv,
  downloadAgentDigestCsv,
  downloadAgentDigestDateCsv,
  downloadDigestDeadLetterCsv,
  downloadDigestDeadLetterJobCsv,
  downloadDigestDeadLetterSummaryCsv,
  downloadDigestDispatchCsv,
  downloadDigestDispatchesCsv,
  downloadDigestQueuedJobCsv,
  downloadDigestQueuedJobsCsv,
  downloadDigestQueuedJobsSummaryCsv,
  downloadDigestScheduleCsv,
  downloadAgentMilestonesCsv,
  downloadAgentReadinessCheckCsv,
  downloadAgentReadinessCsv,
  downloadAgentToolAuditCsv,
  downloadAgentToolAuditRowCsv,
  downloadAgentToolRowCsv,
  downloadAgentToolsCsv,
  downloadAuthStatusCsv,
  downloadCategoryRuleTemplateCsv,
  downloadChannelAdapterStatusCsv,
  downloadChannelSandboxStatusCsv,
  downloadCompetitorAnchorCsv,
  downloadCrossChannelDashboardRowCsv,
  downloadCrossChannelGuardCsv,
  downloadDynamicRepricingRuleCsv,
  downloadFeatureFlagsCsv,
  downloadFirstAgentMilestoneCsv,
  downloadFirstChannelSandboxEventCsv,
  downloadFirstCompetitorOfferCsv,
  downloadFirstFeatureFlagCsv,
  downloadFirstI18nGlossaryTermCsv,
  downloadI18nGlossaryCsv,
  downloadFirstNotificationTemplateCsv,
  downloadFirstPriceObservationCsv,
  downloadFirstProductReadinessCheckCsv,
  downloadFirstReconciliationAlertCsv,
  downloadFirstWorkerHeartbeatCsv,
  downloadFxRateCsv,
  downloadLatestAdjustmentBatchIndexCsv,
  downloadLatestCompetitorCurvePointCsv,
  downloadLatestCostSheetCsv,
  downloadLatestListingSyncJobCsv,
  downloadLatestQueuePriceVersionCsv,
  downloadLatestRepricingBatchJobCsv,
  downloadLatestRepricingEventCsv,
  downloadListingCsv,
  downloadListingIngestStatusCsv,
  downloadListingSyncJobsForListingCsv,
  downloadListingSyncOpsStatusCsv,
  downloadListingSyncScheduleCsv,
  downloadNotificationTemplatesCsv,
  downloadOpsWorkersStatusSummaryCsv,
  downloadP3ReadinessCsv,
  downloadP4ReadinessCsv,
  downloadP5ReadinessCsv,
  downloadPricingContextCsv,
  downloadPricingSnapshotCsv,
  downloadPricingSnapshotRowCsv,
  downloadProductReadinessCsv,
  downloadReconciliationAlertsDirectCsv,
  downloadReconciliationAlertsReportCsv,
  downloadRepricingBatchJobsSummaryCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadRuleCompilerStatusCsv,
  downloadSharedFeeTemplateCsv,
  downloadShopCsv,
  downloadSkuCatalogCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadSkuRepricingQueueCsv,
  downloadTariffHsRateCsv,
  downloadTenantSharedFeeTemplatesCsv,
  downloadVersionBackupCsv,
  LISTING_BY_CHANNEL,
} from "../api/client";
import { ExportHub } from "@/components/patterns/ExportHub";

export function CopilotExportHub({
  locale,
  listingId,
  t,
  setMessage,
  firstReadinessCheckId,
  tools,
  audit,
  lastDispatchJobId,
  digestJobs,
  digestDlq,
  digestDate,
}: {
  locale: string;
  listingId: string;
  t: TFunction;
  setMessage: (msg: string) => void;
  firstReadinessCheckId: string | null;
  tools: Array<{ name: string; mode: string; description: string }>;
  audit: Array<{ id: string }>;
  lastDispatchJobId: string | null;
  digestJobs: { items: Array<{ job_id: string }> } | null;
  digestDlq: { items: Array<{ job_id: string }> } | null;
  digestDate: string | null;
}) {
  return (
    <ExportHub title={t("exportActions")} description={t("exportHubHint")}>
      <button
                  type="button"
                  data-testid="copilot-p4-readiness-export"
                  onClick={() =>
                    void downloadP4ReadinessCsv(locale).then(() =>
                      setMessage(t("readinessP4ExportDone"))
                    )
                  }
                >
                  {t("readinessP4ExportCsv")}
                </button>
      <button
                type="button"
                data-testid="copilot-rule-compiler-export"
                onClick={() =>
                  void downloadRuleCompilerStatusCsv(locale).then(() =>
                    setMessage(t("copilotRuleCompilerExportDone"))
                  )
                }
              >
                {t("copilotRuleCompilerExportCsv")}
              </button>
      <button
                  type="button"
                  data-testid="copilot-readiness-export"
                  onClick={() =>
                    void downloadAgentReadinessCsv(locale).then(() =>
                      setMessage(t("copilotReadinessExportDone"))
                    )
                  }
                >
                  {t("copilotReadinessExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-readiness-check-export"
                  disabled={!firstReadinessCheckId}
                  onClick={() => {
                    const checkId = firstReadinessCheckId;
                    if (!checkId) return;
                    void downloadAgentReadinessCheckCsv(locale, checkId).then(() =>
                      setMessage(t("copilotReadinessCheckExportDone"))
                    );
                  }}
                >
                  {t("copilotReadinessCheckExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-tools-export"
                  onClick={() => void downloadAgentToolsCsv(locale)}
                >
                  {t("copilotToolsExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-repricing-batch-summary-export"
                  onClick={() =>
                    void downloadRepricingBatchJobsSummaryCsv(locale).then(() =>
                      setMessage(t("copilotRepricingBatchSummaryExportDone"))
                    )
                  }
                >
                  {t("copilotRepricingBatchSummaryExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-feature-flags-export"
                  onClick={() =>
                    void downloadFeatureFlagsCsv(locale).then(() =>
                      setMessage(t("copilotFeatureFlagsExportDone"))
                    )
                  }
                >
                  {t("copilotFeatureFlagsExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-listing-ingest-status-export"
                  onClick={() =>
                    void downloadListingIngestStatusCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    ).then(() => setMessage(t("copilotListingIngestStatusExportDone")))
                  }
                >
                  {t("copilotListingIngestStatusExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-product-readiness-export"
                  onClick={() =>
                    void downloadProductReadinessCsv(locale).then(() =>
                      setMessage(t("copilotProductReadinessExportDone"))
                    )
                  }
                >
                  {t("copilotProductReadinessExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-competitor-anchor-export"
                  onClick={() =>
                    void downloadCompetitorAnchorCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    ).then(() => setMessage(t("copilotCompetitorAnchorExportDone")))
                  }
                >
                  {t("copilotCompetitorAnchorExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-channel-adapter-export"
                  onClick={() =>
                    void downloadChannelAdapterStatusCsv(locale).then(() =>
                      setMessage(t("copilotChannelAdapterExportDone"))
                    )
                  }
                >
                  {t("copilotChannelAdapterExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-auth-export"
                  onClick={() =>
                    void downloadAuthStatusCsv(locale).then(() =>
                      setMessage(t("copilotAuthExportDone"))
                    )
                  }
                >
                  {t("copilotAuthExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-channel-sandbox-status-export"
                  onClick={() =>
                    void downloadChannelSandboxStatusCsv(locale).then(() =>
                      setMessage(t("copilotChannelSandboxStatusExportDone"))
                    )
                  }
                >
                  {t("copilotChannelSandboxStatusExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-listing-sync-schedule-export"
                  onClick={() =>
                    void downloadListingSyncScheduleCsv(locale).then(() =>
                      setMessage(t("copilotListingSyncScheduleExportDone"))
                    )
                  }
                >
                  {t("copilotListingSyncScheduleExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-agent-milestones-export"
                  onClick={() =>
                    void downloadAgentMilestonesCsv(locale).then(() =>
                      setMessage(t("copilotAgentMilestonesExportDone"))
                    )
                  }
                >
                  {t("copilotAgentMilestonesExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-adjustment-approval-policy-export"
                  onClick={() =>
                    void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
                      setMessage(t("copilotAdjustmentApprovalPolicyExportDone"))
                    )
                  }
                >
                  {t("copilotAdjustmentApprovalPolicyExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-ops-workers-summary-export"
                  onClick={() =>
                    void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
                      setMessage(t("copilotOpsWorkersSummaryExportDone"))
                    )
                  }
                >
                  {t("copilotOpsWorkersSummaryExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-pricing-snapshot-export"
                  onClick={() =>
                    void downloadPricingSnapshotCsv(locale, DEMO_SKU).then(() =>
                      setMessage(t("copilotPricingSnapshotExportDone"))
                    )
                  }
                >
                  {t("copilotPricingSnapshotExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-cross-channel-guard-export"
                  onClick={() =>
                    void downloadCrossChannelGuardCsv(locale, DEMO_SKU).then(() =>
                      setMessage(t("copilotCrossChannelGuardExportDone"))
                    )
                  }
                >
                  {t("copilotCrossChannelGuardExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-dynamic-repricing-rule-export"
                  onClick={() =>
                    void downloadDynamicRepricingRuleCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    ).then(() => setMessage(t("copilotDynamicRepricingRuleExportDone")))
                  }
                >
                  {t("copilotDynamicRepricingRuleExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-repricing-queue-sku-export"
                  onClick={() =>
                    void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
                      setMessage(t("copilotRepricingQueueSkuExportDone"))
                    )
                  }
                >
                  {t("copilotRepricingQueueSkuExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-repricing-batch-shard-plan-export"
                  onClick={() =>
                    void downloadRepricingBatchShardPlanCsv(locale, DEMO_SKU, 2).then(
                      () => setMessage(t("copilotRepricingBatchShardPlanExportDone"))
                    )
                  }
                >
                  {t("copilotRepricingBatchShardPlanExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-sku-category-template-export"
                  onClick={() =>
                    void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
                      setMessage(t("copilotSkuCategoryRuleTemplateExportDone"))
                    )
                  }
                >
                  {t("copilotSkuCategoryRuleTemplateExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-reconciliation-report-export"
                  onClick={() =>
                    void downloadReconciliationAlertsReportCsv(locale).then(() =>
                      setMessage(t("copilotReconciliationReportExportDone"))
                    )
                  }
                >
                  {t("copilotReconciliationReportExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-pricing-context-export"
                  onClick={() =>
                    void downloadPricingContextCsv(
                      locale,
                      listingId === "listing-ml-001" ? "MERCADO_LIBRE" : "AMAZON_MX",
                      DEMO_SKU
                    ).then(() => setMessage(t("copilotPricingContextExportDone")))
                  }
                >
                  {t("copilotPricingContextExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-repricing-batch-job-export"
                  onClick={() =>
                    void downloadLatestRepricingBatchJobCsv(locale)
                      .then(() => setMessage(t("copilotRepricingBatchJobExportDone")))
                      .catch(() => setMessage(t("copilotRepricingBatchJobExportEmpty")))
                  }
                >
                  {t("copilotRepricingBatchJobExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-category-rule-template-export"
                  onClick={() =>
                    void downloadCategoryRuleTemplateCsv(
                      locale,
                      "cat-electronics-mx"
                    ).then(() => setMessage(t("copilotCategoryRuleTemplateExportDone")))
                  }
                >
                  {t("copilotCategoryRuleTemplateExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-price-version-export"
                  onClick={() =>
                    void downloadLatestQueuePriceVersionCsv(locale, DEMO_SKU)
                      .then(() => setMessage(t("copilotPriceVersionExportDone")))
                      .catch(() => setMessage(t("copilotPriceVersionExportEmpty")))
                  }
                >
                  {t("copilotPriceVersionExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-version-backup-csv"
                  onClick={() =>
                    void downloadVersionBackupCsv(locale).then(() =>
                      setMessage(t("copilotVersionBackupCsvDone"))
                    )
                  }
                >
                  {t("copilotVersionBackupCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-p5-readiness-export"
                  onClick={() =>
                    void downloadP5ReadinessCsv(locale).then(() =>
                      setMessage(t("copilotP5ReadinessExportDone"))
                    )
                  }
                >
                  {t("copilotP5ReadinessExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-shop-export"
                  onClick={() =>
                    void downloadShopCsv(locale, "shop-ml-demo").then(() =>
                      setMessage(t("copilotShopExportDone"))
                    )
                  }
                >
                  {t("copilotShopExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-p3-readiness-export"
                  onClick={() =>
                    void downloadP3ReadinessCsv(locale).then(() =>
                      setMessage(t("copilotP3ReadinessExportDone"))
                    )
                  }
                >
                  {t("copilotP3ReadinessExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-shared-fee-template-export"
                  onClick={() =>
                    void downloadSharedFeeTemplateCsv(
                      locale,
                      "fee-tpl-ml-electronics"
                    ).then(() => setMessage(t("copilotSharedFeeTemplateExportDone")))
                  }
                >
                  {t("copilotSharedFeeTemplateExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-tenant-shared-fee-export"
                  onClick={() =>
                    void downloadTenantSharedFeeTemplatesCsv(locale, "tenant-demo").then(
                      () => setMessage(t("copilotTenantSharedFeeTemplatesExportDone"))
                    )
                  }
                >
                  {t("copilotTenantSharedFeeTemplatesExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-sku-catalog-export"
                  onClick={() =>
                    void downloadSkuCatalogCsv(locale, DEMO_SKU).then(() =>
                      setMessage(t("copilotSkuCatalogExportDone"))
                    )
                  }
                >
                  {t("copilotSkuCatalogExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-listing-export"
                  onClick={() =>
                    void downloadListingCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    ).then(() => setMessage(t("copilotListingExportDone")))
                  }
                >
                  {t("copilotListingExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-tariff-rate-export"
                  onClick={() =>
                    void downloadTariffHsRateCsv(locale, "HS-ELECTRONICS-MX").then(
                      () => setMessage(t("copilotTariffRateExportDone"))
                    )
                  }
                >
                  {t("copilotTariffRateExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-fx-rate-export"
                  onClick={() =>
                    void downloadFxRateCsv(locale, "USD", "MXN").then(() =>
                      setMessage(t("copilotFxRateExportDone"))
                    )
                  }
                >
                  {t("copilotFxRateExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-cost-sheet-row-export"
                  onClick={() =>
                    void downloadLatestCostSheetCsv(locale, DEMO_SKU)
                      .then(() => setMessage(t("copilotCostSheetRowExportDone")))
                      .catch(() => setMessage(t("copilotCostSheetRowExportEmpty")))
                  }
                >
                  {t("copilotCostSheetRowExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-competitor-offer-export"
                  onClick={() =>
                    void downloadFirstCompetitorOfferCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    )
                      .then(() => setMessage(t("copilotCompetitorOfferExportDone")))
                      .catch(() => setMessage(t("copilotCompetitorOfferExportEmpty")))
                  }
                >
                  {t("copilotCompetitorOfferExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-reconciliation-alert-export"
                  onClick={() =>
                    void downloadFirstReconciliationAlertCsv(locale)
                      .then(() => setMessage(t("copilotReconciliationAlertExportDone")))
                      .catch(() => setMessage(t("copilotReconciliationAlertExportEmpty")))
                  }
                >
                  {t("copilotReconciliationAlertExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-reconciliation-direct-export"
                  onClick={() =>
                    void downloadReconciliationAlertsDirectCsv(locale).then(() =>
                      setMessage(t("copilotReconciliationDirectExportDone"))
                    )
                  }
                >
                  {t("copilotReconciliationDirectExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-listing-sync-ops-export"
                  onClick={() =>
                    void downloadListingSyncOpsStatusCsv(locale).then(() =>
                      setMessage(t("copilotListingSyncOpsExportDone"))
                    )
                  }
                >
                  {t("copilotListingSyncOpsExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-listing-sync-amz-export"
                  onClick={() =>
                    void downloadListingSyncJobsForListingCsv(
                      locale,
                      "listing-amz-001"
                    ).then(() => setMessage(t("copilotListingSyncAmzExportDone")))}
                >
                  {t("copilotListingSyncAmzExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-listing-sync-job-export"
                  onClick={() =>
                    void downloadLatestListingSyncJobCsv(locale)
                      .then(() => setMessage(t("copilotListingSyncJobExportDone")))
                      .catch(() => setMessage(t("copilotListingSyncJobExportEmpty")))
                  }
                >
                  {t("copilotListingSyncJobExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-worker-heartbeat-export"
                  onClick={() =>
                    void downloadFirstWorkerHeartbeatCsv(locale)
                      .then(() => setMessage(t("copilotWorkerHeartbeatExportDone")))
                      .catch(() => setMessage(t("copilotWorkerHeartbeatExportEmpty")))
                  }
                >
                  {t("copilotWorkerHeartbeatExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-sandbox-event-export"
                  onClick={() =>
                    void downloadFirstChannelSandboxEventCsv(locale)
                      .then(() => setMessage(t("copilotSandboxEventExportDone")))
                      .catch(() => setMessage(t("copilotSandboxEventExportEmpty")))
                  }
                >
                  {t("copilotSandboxEventExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-price-observation-export"
                  onClick={() =>
                    void downloadFirstPriceObservationCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    )
                      .then(() => setMessage(t("copilotPriceObservationExportDone")))
                      .catch(() => setMessage(t("copilotPriceObservationExportEmpty")))
                  }
                >
                  {t("copilotPriceObservationExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-repricing-event-export"
                  onClick={() =>
                    void downloadLatestRepricingEventCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    )
                      .then(() => setMessage(t("copilotRepricingEventExportDone")))
                      .catch(() => setMessage(t("copilotRepricingEventExportEmpty")))
                  }
                >
                  {t("copilotRepricingEventExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-adjustment-batch-index-export"
                  onClick={() =>
                    void downloadLatestAdjustmentBatchIndexCsv(locale)
                      .then(() => setMessage(t("copilotAdjustmentBatchIndexExportDone")))
                      .catch(() => setMessage(t("copilotAdjustmentBatchIndexExportEmpty")))
                  }
                >
                  {t("copilotAdjustmentBatchIndexExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-pricing-row-export"
                  onClick={() =>
                    void downloadPricingSnapshotRowCsv(
                      locale,
                      DEMO_SKU,
                      "MERCADO_LIBRE"
                    )
                      .then(() => setMessage(t("copilotPricingRowExportDone")))
                      .catch(() => setMessage(t("copilotPricingRowExportEmpty")))
                  }
                >
                  {t("copilotPricingRowExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-cross-channel-row-export"
                  onClick={() =>
                    void downloadCrossChannelDashboardRowCsv(locale, DEMO_SKU)
                      .then(() => setMessage(t("copilotCrossChannelRowExportDone")))
                      .catch(() => setMessage(t("copilotCrossChannelRowExportEmpty")))
                  }
                >
                  {t("copilotCrossChannelRowExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-curve-point-export"
                  onClick={() =>
                    void downloadLatestCompetitorCurvePointCsv(
                      locale,
                      LISTING_BY_CHANNEL.MERCADO_LIBRE
                    )
                      .then(() => setMessage(t("copilotCurvePointExportDone")))
                      .catch(() => setMessage(t("copilotCurvePointExportEmpty")))
                  }
                >
                  {t("copilotCurvePointExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-agent-milestone-export"
                  onClick={() =>
                    void downloadFirstAgentMilestoneCsv(locale)
                      .then(() => setMessage(t("copilotAgentMilestoneExportDone")))
                      .catch(() => setMessage(t("copilotAgentMilestoneExportEmpty")))
                  }
                >
                  {t("copilotAgentMilestoneExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-product-readiness-check-export"
                  onClick={() =>
                    void downloadFirstProductReadinessCheckCsv(locale)
                      .then(() => setMessage(t("copilotProductReadinessCheckExportDone")))
                      .catch(() => setMessage(t("copilotProductReadinessCheckExportEmpty")))
                  }
                >
                  {t("copilotProductReadinessCheckExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-feature-flag-export"
                  onClick={() =>
                    void downloadFirstFeatureFlagCsv(locale)
                      .then(() => setMessage(t("copilotFeatureFlagExportDone")))
                      .catch(() => setMessage(t("copilotFeatureFlagExportEmpty")))
                  }
                >
                  {t("copilotFeatureFlagExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-i18n-glossary-export"
                  onClick={() =>
                    void downloadI18nGlossaryCsv(locale)
                      .then(() => setMessage(t("copilotI18nGlossaryExportDone")))
                      .catch(() => setMessage(t("copilotI18nGlossaryExportEmpty")))
                  }
                >
                  {t("copilotI18nGlossaryExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-i18n-glossary-term-export"
                  onClick={() =>
                    void downloadFirstI18nGlossaryTermCsv(locale)
                      .then(() => setMessage(t("copilotI18nGlossaryTermExportDone")))
                      .catch(() => setMessage(t("copilotI18nGlossaryTermExportEmpty")))
                  }
                >
                  {t("copilotI18nGlossaryTermExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-notification-templates-export"
                  onClick={() =>
                    void downloadNotificationTemplatesCsv(locale)
                      .then(() => setMessage(t("copilotNotificationTemplatesExportDone")))
                      .catch(() => setMessage(t("copilotNotificationTemplatesExportEmpty")))
                  }
                >
                  {t("copilotNotificationTemplatesExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-notification-template-export"
                  onClick={() =>
                    void downloadFirstNotificationTemplateCsv(locale)
                      .then(() => setMessage(t("copilotNotificationTemplateExportDone")))
                      .catch(() => setMessage(t("copilotNotificationTemplateExportEmpty")))
                  }
                >
                  {t("copilotNotificationTemplateExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-tool-row-export"
                  disabled={!tools[0]}
                  onClick={() => {
                    const toolName = tools[0]?.name;
                    if (!toolName) return;
                    void downloadAgentToolRowCsv(locale, toolName).then(() =>
                      setMessage(t("copilotToolRowExportDone"))
                    );
                  }}
                >
                  {t("copilotToolRowExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-audit-export"
                  onClick={() => void downloadAgentToolAuditCsv(locale)}
                >
                  {t("copilotAuditExportCsv")}
                </button>
      <button
                  type="button"
                  data-testid="copilot-audit-row-export"
                  disabled={!audit[0]}
                  onClick={() => {
                    const auditId = audit[0]?.id;
                    if (!auditId) return;
                    void downloadAgentToolAuditRowCsv(locale, auditId).then(() =>
                      setMessage(t("copilotAuditRowExportDone"))
                    );
                  }}
                >
                  {t("copilotAuditRowExportCsv")}
                </button>
      <button
        type="button"
        data-testid="copilot-digest-schedule-export"
        onClick={() =>
          void downloadDigestScheduleCsv(locale).then(() =>
            setMessage(t("copilotDigestScheduleExportDone"))
          )
        }
      >
        {t("copilotDigestScheduleExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-dispatches-export"
        onClick={() => void downloadDigestDispatchesCsv(locale)}
      >
        {t("copilotDigestDispatchesExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-dispatch-export"
        disabled={!lastDispatchJobId}
        onClick={() => {
          const jobId = lastDispatchJobId;
          if (!jobId) return;
          void downloadDigestDispatchCsv(locale, jobId).then(() =>
            setMessage(t("copilotDigestDispatchExportDone"))
          );
        }}
      >
        {t("copilotDigestDispatchExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-jobs-summary-export"
        onClick={() =>
          void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
            setMessage(t("copilotDigestJobsSummaryExportDone"))
          )
        }
      >
        {t("copilotDigestJobsSummaryExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-jobs-export"
        onClick={() => void downloadDigestQueuedJobsCsv(locale)}
      >
        {t("copilotDigestJobsExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-job-export"
        disabled={!digestJobs?.items[0]}
        onClick={() => {
          const jobId = digestJobs?.items[0]?.job_id;
          if (!jobId) return;
          void downloadDigestQueuedJobCsv(locale, jobId).then(() =>
            setMessage(t("copilotDigestJobExportDone"))
          );
        }}
      >
        {t("copilotDigestJobExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-dlq-summary-export"
        onClick={() =>
          void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
            setMessage(t("copilotDigestDlqSummaryExportDone"))
          )
        }
      >
        {t("copilotDigestDlqSummaryExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-dlq-export"
        onClick={() => void downloadDigestDeadLetterCsv(locale)}
      >
        {t("copilotDigestDlqExportCsv")}
      </button>
      <button
        type="button"
        data-testid="copilot-digest-dlq-job-export"
        disabled={!digestDlq?.items[0]}
        onClick={() => {
          const jobId = digestDlq?.items[0]?.job_id;
          if (!jobId) return;
          void downloadDigestDeadLetterJobCsv(locale, jobId).then(() =>
            setMessage(t("copilotDigestDlqJobExportDone"))
          );
        }}
      >
        {t("copilotDigestDlqJobExportCsv")}
      </button>
      <button
                    type="button"
                    data-testid="copilot-digest-export"
                    onClick={() => void downloadAgentDigestCsv(locale)}
                  >
                    {t("copilotDigestExportCsv")}
                  </button>
      <button
                    type="button"
                    data-testid="copilot-digest-date-export"
                    disabled={!digestDate}
                    onClick={() => {
                      const date = digestDate;
                      if (!date) return;
                      void downloadAgentDigestDateCsv(locale, date).then(() =>
                        setMessage(t("copilotDigestDateExportDone"))
                      );
                    }}
                  >
                    {t("copilotDigestDateExportCsv")}
                  </button>
    </ExportHub>
  );
}
