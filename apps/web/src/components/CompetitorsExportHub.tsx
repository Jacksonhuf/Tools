import type { TFunction } from "i18next";
import {
  createCopilotSession,
  DEMO_SKU,
  downloadAdjustmentApprovalPolicyCsv,
  downloadAgentMilestonesCsv,
  downloadAgentReadinessCsv,
  downloadAgentToolsCsv,
  downloadAuthStatusCsv,
  downloadCategoryRuleTemplateCsv,
  downloadChannelAdapterStatusCsv,
  downloadChannelSandboxStatusCsv,
  downloadCompetitorAnchorCsv,
  downloadCompetitorCurveCsv,
  downloadCompetitorCurveDirect,
  downloadCompetitorCurvePointCsv,
  downloadCompetitorOfferCsv,
  downloadCompetitorOffersCsv,
  downloadCopilotSessionCsv,
  downloadCrossChannelDashboardRowCsv,
  downloadCrossChannelGuardCsv,
  downloadDigestDeadLetterSummaryCsv,
  downloadDigestQueuedJobsSummaryCsv,
  downloadDigestScheduleCsv,
  downloadDynamicRepricingRuleCsv,
  downloadFeatureFlagsCsv,
  downloadFirstAgentMilestoneCsv,
  downloadFirstAgentReadinessCheckCsv,
  downloadFirstAgentToolAuditRowCsv,
  downloadFirstAgentToolRowCsv,
  downloadFirstChannelSandboxEventCsv,
  downloadFirstDigestDeadLetterJobCsv,
  downloadFirstFeatureFlagCsv,
  downloadFirstI18nGlossaryTermCsv,
  downloadI18nGlossaryCsv,
  downloadFirstNotificationTemplateCsv,
  downloadFirstProductReadinessCheckCsv,
  downloadFirstReconciliationAlertCsv,
  downloadFirstWorkerHeartbeatCsv,
  downloadFxRateCsv,
  downloadLatestAdjustmentBatchIndexCsv,
  downloadLatestAgentDigestDateCsv,
  downloadLatestCostSheetCsv,
  downloadLatestDigestDispatchCsv,
  downloadLatestDigestQueuedJobCsv,
  downloadLatestListingSyncJobCsv,
  downloadLatestQueuePriceVersionCsv,
  downloadLatestRepricingBatchJobCsv,
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
  downloadPriceHistoryCsv,
  downloadPriceObservationCsv,
  downloadPricingContextCsv,
  downloadPricingSnapshotCsv,
  downloadPricingSnapshotRowCsv,
  downloadProductReadinessCsv,
  downloadReconciliationAlertCsv,
  downloadReconciliationAlertsDirectCsv,
  downloadReconciliationAlertsReportCsv,
  downloadRepricingBatchJobsSummaryCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadRepricingEventCsv,
  downloadRepricingEventsCsv,
  downloadRuleCompilerStatusCsv,
  downloadSharedFeeTemplateCsv,
  downloadShopCsv,
  downloadSkuCatalogCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadSkuRepricingQueueCsv,
  downloadTariffHsRateCsv,
  downloadTenantSharedFeeTemplatesCsv,
  downloadVersionBackupCsv,
} from "../api/client";
import { ExportHub } from "@/components/patterns/ExportHub";

export function CompetitorsExportHub({
  locale,
  listingId,
  selectedOffer,
  t,
  setMessage,
  latestObservationId,
  latestRepricingEventId,
  latestCurveDate,
}: {
  locale: string;
  listingId: string;
  selectedOffer: string | null;
  t: TFunction;
  setMessage: (msg: string) => void;
  latestObservationId: string | null;
  latestRepricingEventId: string | null;
  latestCurveDate: string | null;
}) {
  return (
    <ExportHub title={t("exportActions")} description={t("exportHubHint")}>
<button
          type="button"
          data-testid="competitor-dynamic-rule-export"
          onClick={() =>
            void downloadDynamicRepricingRuleCsv(locale, listingId).then(() =>
              setMessage(t("dynamicRepricingRuleExportDone"))
            )
          }
        >
          {t("dynamicRepricingRuleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-anchor-export"
          onClick={() =>
            void downloadCompetitorAnchorCsv(locale, listingId).then(() =>
              setMessage(t("competitorAnchorExportDone"))
            )
          }
        >
          {t("competitorAnchorExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-repricing-batch-summary-export"
          onClick={() =>
            void downloadRepricingBatchJobsSummaryCsv(locale).then(() =>
              setMessage(t("competitorRepricingBatchSummaryExportDone"))
            )
          }
        >
          {t("competitorRepricingBatchSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-feature-flags-export"
          onClick={() =>
            void downloadFeatureFlagsCsv(locale).then(() =>
              setMessage(t("competitorFeatureFlagsExportDone"))
            )
          }
        >
          {t("competitorFeatureFlagsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-readiness-export"
          onClick={() =>
            void downloadAgentReadinessCsv(locale).then(() =>
              setMessage(t("competitorAgentReadinessExportDone"))
            )
          }
        >
          {t("competitorAgentReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-product-readiness-export"
          onClick={() =>
            void downloadProductReadinessCsv(locale).then(() =>
              setMessage(t("competitorProductReadinessExportDone"))
            )
          }
        >
          {t("competitorProductReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-channel-adapter-export"
          onClick={() =>
            void downloadChannelAdapterStatusCsv(locale).then(() =>
              setMessage(t("competitorChannelAdapterExportDone"))
            )
          }
        >
          {t("competitorChannelAdapterExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-rule-compiler-export"
          onClick={() =>
            void downloadRuleCompilerStatusCsv(locale).then(() =>
              setMessage(t("competitorRuleCompilerExportDone"))
            )
          }
        >
          {t("competitorRuleCompilerExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-digest-jobs-summary-export"
          onClick={() =>
            void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
              setMessage(t("competitorDigestJobsSummaryExportDone"))
            )
          }
        >
          {t("competitorDigestJobsSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-auth-export"
          onClick={() =>
            void downloadAuthStatusCsv(locale).then(() =>
              setMessage(t("competitorAuthExportDone"))
            )
          }
        >
          {t("competitorAuthExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-channel-sandbox-status-export"
          onClick={() =>
            void downloadChannelSandboxStatusCsv(locale).then(() =>
              setMessage(t("competitorChannelSandboxStatusExportDone"))
            )
          }
        >
          {t("competitorChannelSandboxStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-digest-dlq-summary-export"
          onClick={() =>
            void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
              setMessage(t("competitorDigestDlqSummaryExportDone"))
            )
          }
        >
          {t("competitorDigestDlqSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-listing-sync-schedule-export"
          onClick={() =>
            void downloadListingSyncScheduleCsv(locale).then(() =>
              setMessage(t("competitorListingSyncScheduleExportDone"))
            )
          }
        >
          {t("competitorListingSyncScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-milestones-export"
          onClick={() =>
            void downloadAgentMilestonesCsv(locale).then(() =>
              setMessage(t("competitorAgentMilestonesExportDone"))
            )
          }
        >
          {t("competitorAgentMilestonesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-adjustment-approval-policy-export"
          onClick={() =>
            void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
              setMessage(t("competitorAdjustmentApprovalPolicyExportDone"))
            )
          }
        >
          {t("competitorAdjustmentApprovalPolicyExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-ops-workers-summary-export"
          onClick={() =>
            void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
              setMessage(t("competitorOpsWorkersSummaryExportDone"))
            )
          }
        >
          {t("competitorOpsWorkersSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-pricing-snapshot-export"
          onClick={() =>
            void downloadPricingSnapshotCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("competitorPricingSnapshotExportDone"))
            )
          }
        >
          {t("competitorPricingSnapshotExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-cross-channel-guard-export"
          onClick={() =>
            void downloadCrossChannelGuardCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("competitorCrossChannelGuardExportDone"))
            )
          }
        >
          {t("competitorCrossChannelGuardExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-digest-schedule-export"
          onClick={() =>
            void downloadDigestScheduleCsv(locale).then(() =>
              setMessage(t("competitorDigestScheduleExportDone"))
            )
          }
        >
          {t("competitorDigestScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-repricing-queue-sku-export"
          onClick={() =>
            void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("competitorRepricingQueueSkuExportDone"))
            )
          }
        >
          {t("competitorRepricingQueueSkuExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-repricing-batch-shard-plan-export"
          onClick={() =>
            void downloadRepricingBatchShardPlanCsv(locale, DEMO_SKU, 2).then(
              () => setMessage(t("competitorRepricingBatchShardPlanExportDone"))
            )
          }
        >
          {t("competitorRepricingBatchShardPlanExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-sku-category-template-export"
          onClick={() =>
            void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("competitorSkuCategoryRuleTemplateExportDone"))
            )
          }
        >
          {t("competitorSkuCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-reconciliation-report-export"
          onClick={() =>
            void downloadReconciliationAlertsReportCsv(locale).then(() =>
              setMessage(t("competitorReconciliationReportExportDone"))
            )
          }
        >
          {t("competitorReconciliationReportExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-pricing-context-export"
          onClick={() =>
            void downloadPricingContextCsv(locale, "MERCADO_LIBRE", DEMO_SKU).then(
              () => setMessage(t("competitorPricingContextExportDone"))
            )
          }
        >
          {t("competitorPricingContextExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-repricing-batch-job-export"
          onClick={() =>
            void downloadLatestRepricingBatchJobCsv(locale)
              .then(() => setMessage(t("competitorRepricingBatchJobExportDone")))
              .catch(() => setMessage(t("competitorRepricingBatchJobExportEmpty")))
          }
        >
          {t("competitorRepricingBatchJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-category-rule-template-export"
          onClick={() =>
            void downloadCategoryRuleTemplateCsv(
              locale,
              "cat-electronics-mx"
            ).then(() => setMessage(t("competitorCategoryRuleTemplateExportDone")))
          }
        >
          {t("competitorCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-copilot-session-export"
          onClick={() =>
            void createCopilotSession(
              locale,
              listingId,
              DEMO_SKU,
              listingId === "listing-ml-001" ? "MERCADO_LIBRE" : "AMAZON_MX"
            )
              .then((s) => downloadCopilotSessionCsv(locale, s.session_id))
              .then(() => setMessage(t("competitorCopilotSessionExportDone")))
          }
        >
          {t("competitorCopilotSessionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-price-version-export"
          onClick={() =>
            void downloadLatestQueuePriceVersionCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("competitorPriceVersionExportDone")))
              .catch(() => setMessage(t("competitorPriceVersionExportEmpty")))
          }
        >
          {t("competitorPriceVersionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-version-backup-csv"
          onClick={() =>
            void downloadVersionBackupCsv(locale).then(() =>
              setMessage(t("competitorVersionBackupCsvDone"))
            )
          }
        >
          {t("competitorVersionBackupCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-p5-readiness-export"
          onClick={() =>
            void downloadP5ReadinessCsv(locale).then(() =>
              setMessage(t("competitorP5ReadinessExportDone"))
            )
          }
        >
          {t("competitorP5ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-shop-export"
          onClick={() =>
            void downloadShopCsv(locale, "shop-ml-demo").then(() =>
              setMessage(t("competitorShopExportDone"))
            )
          }
        >
          {t("competitorShopExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-p3-readiness-export"
          onClick={() =>
            void downloadP3ReadinessCsv(locale).then(() =>
              setMessage(t("competitorP3ReadinessExportDone"))
            )
          }
        >
          {t("competitorP3ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-p4-readiness-export"
          onClick={() =>
            void downloadP4ReadinessCsv(locale).then(() =>
              setMessage(t("competitorP4ReadinessExportDone"))
            )
          }
        >
          {t("competitorP4ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-shared-fee-template-export"
          onClick={() =>
            void downloadSharedFeeTemplateCsv(
              locale,
              "fee-tpl-ml-electronics"
            ).then(() => setMessage(t("competitorSharedFeeTemplateExportDone")))
          }
        >
          {t("competitorSharedFeeTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-tenant-shared-fee-export"
          onClick={() =>
            void downloadTenantSharedFeeTemplatesCsv(locale, "tenant-demo").then(
              () => setMessage(t("competitorTenantSharedFeeTemplatesExportDone"))
            )
          }
        >
          {t("competitorTenantSharedFeeTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-sku-catalog-export"
          onClick={() =>
            void downloadSkuCatalogCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("competitorSkuCatalogExportDone"))
            )
          }
        >
          {t("competitorSkuCatalogExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-listing-export"
          onClick={() =>
            void downloadListingCsv(locale, listingId).then(() =>
              setMessage(t("competitorListingExportDone"))
            )
          }
        >
          {t("competitorListingExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-tariff-rate-export"
          onClick={() =>
            void downloadTariffHsRateCsv(locale, "HS-ELECTRONICS-MX").then(() =>
              setMessage(t("competitorTariffRateExportDone"))
            )
          }
        >
          {t("competitorTariffRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-fx-rate-export"
          onClick={() =>
            void downloadFxRateCsv(locale, "USD", "MXN").then(() =>
              setMessage(t("competitorFxRateExportDone"))
            )
          }
        >
          {t("competitorFxRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-cost-sheet-row-export"
          onClick={() =>
            void downloadLatestCostSheetCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("competitorCostSheetRowExportDone")))
              .catch(() => setMessage(t("competitorCostSheetRowExportEmpty")))
          }
        >
          {t("competitorCostSheetRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-reconciliation-alert-export"
          onClick={() =>
            void downloadFirstReconciliationAlertCsv(locale)
              .then(() => setMessage(t("competitorReconciliationAlertExportDone")))
              .catch(() => setMessage(t("competitorReconciliationAlertExportEmpty")))
          }
        >
          {t("competitorReconciliationAlertExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-reconciliation-direct-export"
          onClick={() =>
            void downloadReconciliationAlertsDirectCsv(locale).then(() =>
              setMessage(t("competitorReconciliationDirectExportDone"))
            )
          }
        >
          {t("competitorReconciliationDirectExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-listing-sync-ops-export"
          onClick={() =>
            void downloadListingSyncOpsStatusCsv(locale).then(() =>
              setMessage(t("competitorListingSyncOpsExportDone"))
            )
          }
        >
          {t("competitorListingSyncOpsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-listing-sync-amz-export"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-amz-001"
            ).then(() => setMessage(t("competitorListingSyncAmzExportDone")))}
        >
          {t("competitorListingSyncAmzExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-tools-export"
          onClick={() =>
            void downloadAgentToolsCsv(locale).then(() =>
              setMessage(t("competitorAgentToolsExportDone"))
            )
          }
        >
          {t("competitorAgentToolsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-listing-sync-job-export"
          onClick={() =>
            void downloadLatestListingSyncJobCsv(locale)
              .then(() => setMessage(t("competitorListingSyncJobExportDone")))
              .catch(() => setMessage(t("competitorListingSyncJobExportEmpty")))
          }
        >
          {t("competitorListingSyncJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-digest-queued-job-export"
          onClick={() =>
            void downloadLatestDigestQueuedJobCsv(locale)
              .then(() => setMessage(t("competitorDigestQueuedJobExportDone")))
              .catch(() => setMessage(t("competitorDigestQueuedJobExportEmpty")))
          }
        >
          {t("competitorDigestQueuedJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-worker-heartbeat-export"
          onClick={() =>
            void downloadFirstWorkerHeartbeatCsv(locale)
              .then(() => setMessage(t("competitorWorkerHeartbeatExportDone")))
              .catch(() => setMessage(t("competitorWorkerHeartbeatExportEmpty")))
          }
        >
          {t("competitorWorkerHeartbeatExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-digest-dispatch-export"
          onClick={() =>
            void downloadLatestDigestDispatchCsv(locale)
              .then(() => setMessage(t("competitorDigestDispatchExportDone")))
              .catch(() => setMessage(t("competitorDigestDispatchExportEmpty")))
          }
        >
          {t("competitorDigestDispatchExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-sandbox-event-export"
          onClick={() =>
            void downloadFirstChannelSandboxEventCsv(locale)
              .then(() => setMessage(t("competitorSandboxEventExportDone")))
              .catch(() => setMessage(t("competitorSandboxEventExportEmpty")))
          }
        >
          {t("competitorSandboxEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-digest-dead-letter-job-export"
          onClick={() =>
            void downloadFirstDigestDeadLetterJobCsv(locale)
              .then(() => setMessage(t("competitorDigestDeadLetterJobExportDone")))
              .catch(() => setMessage(t("competitorDigestDeadLetterJobExportEmpty")))
          }
        >
          {t("competitorDigestDeadLetterJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-tool-audit-row-export"
          onClick={() =>
            void downloadFirstAgentToolAuditRowCsv(locale)
              .then(() => setMessage(t("competitorAgentToolAuditRowExportDone")))
              .catch(() => setMessage(t("competitorAgentToolAuditRowExportEmpty")))
          }
        >
          {t("competitorAgentToolAuditRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-adjustment-batch-index-export"
          onClick={() =>
            void downloadLatestAdjustmentBatchIndexCsv(locale)
              .then(() => setMessage(t("competitorAdjustmentBatchIndexExportDone")))
              .catch(() => setMessage(t("competitorAdjustmentBatchIndexExportEmpty")))
          }
        >
          {t("competitorAdjustmentBatchIndexExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-digest-date-export"
          onClick={() =>
            void downloadLatestAgentDigestDateCsv(locale)
              .then(() => setMessage(t("competitorAgentDigestDateExportDone")))
              .catch(() => setMessage(t("competitorAgentDigestDateExportEmpty")))
          }
        >
          {t("competitorAgentDigestDateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-pricing-row-export"
          onClick={() =>
            void downloadPricingSnapshotRowCsv(
              locale,
              DEMO_SKU,
              "MERCADO_LIBRE"
            )
              .then(() => setMessage(t("competitorPricingRowExportDone")))
              .catch(() => setMessage(t("competitorPricingRowExportEmpty")))
          }
        >
          {t("competitorPricingRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-cross-channel-row-export"
          onClick={() =>
            void downloadCrossChannelDashboardRowCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("competitorCrossChannelRowExportDone")))
              .catch(() => setMessage(t("competitorCrossChannelRowExportEmpty")))
          }
        >
          {t("competitorCrossChannelRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-tool-row-export"
          onClick={() =>
            void downloadFirstAgentToolRowCsv(locale)
              .then(() => setMessage(t("competitorAgentToolRowExportDone")))
              .catch(() => setMessage(t("competitorAgentToolRowExportEmpty")))
          }
        >
          {t("competitorAgentToolRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-readiness-check-export"
          onClick={() =>
            void downloadFirstAgentReadinessCheckCsv(locale)
              .then(() => setMessage(t("competitorAgentReadinessCheckExportDone")))
              .catch(() => setMessage(t("competitorAgentReadinessCheckExportEmpty")))
          }
        >
          {t("competitorAgentReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-agent-milestone-export"
          onClick={() =>
            void downloadFirstAgentMilestoneCsv(locale)
              .then(() => setMessage(t("competitorAgentMilestoneExportDone")))
              .catch(() => setMessage(t("competitorAgentMilestoneExportEmpty")))
          }
        >
          {t("competitorAgentMilestoneExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-product-readiness-check-export"
          onClick={() =>
            void downloadFirstProductReadinessCheckCsv(locale)
              .then(() => setMessage(t("competitorProductReadinessCheckExportDone")))
              .catch(() => setMessage(t("competitorProductReadinessCheckExportEmpty")))
          }
        >
          {t("competitorProductReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-feature-flag-export"
          onClick={() =>
            void downloadFirstFeatureFlagCsv(locale)
              .then(() => setMessage(t("competitorFeatureFlagExportDone")))
              .catch(() => setMessage(t("competitorFeatureFlagExportEmpty")))
          }
        >
          {t("competitorFeatureFlagExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-i18n-glossary-export"
          onClick={() =>
            void downloadI18nGlossaryCsv(locale)
              .then(() => setMessage(t("competitorI18nGlossaryExportDone")))
              .catch(() => setMessage(t("competitorI18nGlossaryExportEmpty")))
          }
        >
          {t("competitorI18nGlossaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-i18n-glossary-term-export"
          onClick={() =>
            void downloadFirstI18nGlossaryTermCsv(locale)
              .then(() => setMessage(t("competitorI18nGlossaryTermExportDone")))
              .catch(() => setMessage(t("competitorI18nGlossaryTermExportEmpty")))
          }
        >
          {t("competitorI18nGlossaryTermExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-notification-templates-export"
          onClick={() =>
            void downloadNotificationTemplatesCsv(locale)
              .then(() => setMessage(t("competitorNotificationTemplatesExportDone")))
              .catch(() => setMessage(t("competitorNotificationTemplatesExportEmpty")))
          }
        >
          {t("competitorNotificationTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-notification-template-export"
          onClick={() =>
            void downloadFirstNotificationTemplateCsv(locale)
              .then(() => setMessage(t("competitorNotificationTemplateExportDone")))
              .catch(() => setMessage(t("competitorNotificationTemplateExportEmpty")))
          }
        >
          {t("competitorNotificationTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-ingest-status-export"
          onClick={() =>
            void downloadListingIngestStatusCsv(locale, listingId).then(() =>
              setMessage(t("listingIngestStatusExportDone"))
            )
          }
        >
          {t("listingIngestStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-offers-export"
          onClick={() =>
            void downloadCompetitorOffersCsv(locale, listingId).then(() =>
              setMessage(t("competitorOffersExportDone"))
            )
          }
        >
          {t("competitorOffersExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-offer-export"
          disabled={!selectedOffer}
          onClick={() => {
            if (!selectedOffer) return;
            void downloadCompetitorOfferCsv(locale, selectedOffer).then(() =>
              setMessage(t("competitorOfferExportDone"))
            );
          }}
        >
          {t("competitorOfferExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-price-history-export"
          onClick={() =>
            void downloadPriceHistoryCsv(locale, listingId, "7d").then(() =>
              setMessage(t("priceHistoryExportDone"))
            )
          }
        >
          {t("priceHistoryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-price-observation-export"
          disabled={!latestObservationId}
          onClick={() => {
            const observationId = latestObservationId;
            if (!observationId) return;
            void downloadPriceObservationCsv(locale, observationId).then(() =>
              setMessage(t("priceObservationExportDone"))
            );
          }}
        >
          {t("priceObservationExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-repricing-events-export"
          onClick={() =>
            void downloadRepricingEventsCsv(locale, listingId).then(() =>
              setMessage(t("repricingEventsExportDone"))
            )
          }
        >
          {t("repricingEventsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-repricing-event-export"
          disabled={!latestRepricingEventId}
          onClick={() => {
            const eventId = latestRepricingEventId;
            if (!eventId) return;
            void downloadRepricingEventCsv(locale, eventId).then(() =>
              setMessage(t("repricingEventExportDone"))
            );
          }}
        >
          {t("repricingEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-curve-export"
          onClick={() =>
            void downloadCompetitorCurveCsv(locale, listingId, "7d").then(() =>
              setMessage(t("competitorCurveExportDone"))
            )
          }
        >
          {t("competitorCurveExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-curve-point-export"
          disabled={!latestCurveDate}
          onClick={() => {
            const curveDate = latestCurveDate;
            if (!curveDate) return;
            void downloadCompetitorCurvePointCsv(
              locale,
              listingId,
              curveDate,
              "7d"
            ).then(() => setMessage(t("competitorCurvePointExportDone")));
          }}
        >
          {t("competitorCurvePointExportCsv")}
        </button>
        <button
          type="button"
          data-testid="competitor-curve-direct-export"
          onClick={() =>
            void downloadCompetitorCurveDirect(locale, listingId, "7d").then(() =>
              setMessage(t("competitorCurveDirectExportDone"))
            )
          }
        >
          {t("competitorCurveDirectExport")}
        </button>
        </ExportHub>
  );
}
