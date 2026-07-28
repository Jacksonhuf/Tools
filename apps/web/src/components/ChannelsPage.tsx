import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchChannelAdapterStatus,
  downloadChannelAdapterStatusCsv,
  downloadChannelSandboxStatusCsv,
  fetchChannelSandboxEvents,
  downloadChannelSandboxEventsCsv,
  downloadChannelSandboxEventCsv,
  downloadShopsCsv,
  downloadShopCsv,
  downloadListingCsv,
  downloadListingSyncJobsForListingCsv,
  downloadListingSyncOpsStatusCsv,
  downloadReconciliationAlertsDirectCsv,
  downloadAgentToolsCsv,
  downloadRepricingBatchJobsSummaryCsv,
  downloadListingIngestStatusCsv,
  downloadFeatureFlagsCsv,
  downloadCompetitorAnchorCsv,
  downloadRuleCompilerStatusCsv,
  downloadDigestQueuedJobsSummaryCsv,
  downloadAuthStatusCsv,
  downloadDigestDeadLetterSummaryCsv,
  downloadListingSyncScheduleCsv,
  downloadAgentMilestonesCsv,
  downloadAdjustmentApprovalPolicyCsv,
  downloadOpsWorkersStatusSummaryCsv,
  DEMO_SKU,
  downloadPricingSnapshotCsv,
  downloadCrossChannelGuardCsv,
  downloadDigestScheduleCsv,
  downloadDynamicRepricingRuleCsv,
  downloadSkuRepricingQueueCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadReconciliationAlertsReportCsv,
  downloadPricingContextCsv,
  downloadLatestRepricingBatchJobCsv,
  downloadCategoryRuleTemplateCsv,
  createCopilotSession,
  downloadCopilotSessionCsv,
  downloadLatestQueuePriceVersionCsv,
  downloadVersionBackupCsv,
  downloadP5ReadinessCsv,
  downloadP3ReadinessCsv,
  downloadP4ReadinessCsv,
  downloadSharedFeeTemplateCsv,
  downloadTenantSharedFeeTemplatesCsv,
  downloadSkuCatalogCsv,
  downloadTariffHsRateCsv,
  downloadFxRateCsv,
  downloadLatestCostSheetCsv,
  downloadFirstCompetitorOfferCsv,
  downloadFirstReconciliationAlertCsv,
  downloadLatestListingSyncJobCsv,
  downloadLatestDigestQueuedJobCsv,
  downloadFirstWorkerHeartbeatCsv,
  downloadLatestDigestDispatchCsv,
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
  downloadFirstAgentMilestoneCsv,
  downloadFirstProductReadinessCheckCsv,
  downloadFirstFeatureFlagCsv,
  downloadI18nGlossaryCsv,
  downloadFirstI18nGlossaryTermCsv,
  downloadNotificationTemplatesCsv,
  downloadFirstNotificationTemplateCsv,
  downloadReconciliationAlertCsv,
  fetchChannelSandboxStatus,
  fetchShops,
  mockCompleteShopOAuth,
  publishShopChannelPrice,
  pullShopListing,
  startShopOAuth,
  syncListingChannel,
  fetchListingSyncJobsForListing,
  type ChannelAdapterStatus,
  type ChannelSandboxEvent,
  type ShopSummary,
} from "../api/client";

const DEMO_REFS: Record<string, string> = {
  MERCADO_LIBRE: "MLM123456",
  AMAZON_MX: "B0TEST123",
};

const SHOP_LISTING_ID: Record<string, string> = {
  "shop-ml-demo": "listing-ml-001",
  "shop-amz-demo": "listing-amz-001",
};

export function ChannelsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sandboxNote, setSandboxNote] = useState<string | null>(null);
  const [sandboxEvents, setSandboxEvents] = useState<ChannelSandboxEvent[]>([]);
  const [adapterStatus, setAdapterStatus] = useState<ChannelAdapterStatus | null>(
    null
  );
  const [lastSyncByListing, setLastSyncByListing] = useState<
    Record<string, { status: string; price: number | null }>
  >({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const [data, sandbox, events, adapters] = await Promise.all([
        fetchShops(locale),
        fetchChannelSandboxStatus(locale),
        fetchChannelSandboxEvents(locale, 25),
        fetchChannelAdapterStatus(locale),
      ]);
      setShops(data.items);
      setSandboxNote(sandbox.enabled ? sandbox.note : null);
      setSandboxEvents(sandbox.enabled ? events.items : []);
      setAdapterStatus(adapters);
      const syncEntries = await Promise.all(
        Object.values(SHOP_LISTING_ID).map(async (listingId) => {
          try {
            const jobs = await fetchListingSyncJobsForListing(locale, listingId);
            const latest = jobs.items[0];
            return [
              listingId,
              latest
                ? {
                    status: latest.status,
                    price: latest.channel_price_mxn,
                  }
                : null,
            ] as const;
          } catch {
            return [listingId, null] as const;
          }
        })
      );
      const syncMap: Record<string, { status: string; price: number | null }> =
        {};
      for (const [listingId, row] of syncEntries) {
        if (row) syncMap[listingId] = row;
      }
      setLastSyncByListing(syncMap);
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    try {
      const start = await startShopOAuth(locale, shop.id);
      await mockCompleteShopOAuth(locale, shop.id, start.state);
      setMessage(t("shopConnected", { name: shop.name }));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const publishActive = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    try {
      const { ok, json } = await publishShopChannelPrice(locale, shop.id, {
        retry_on_step: true,
      });
      if (ok && json.publish_status === "published") {
        const retried =
          "retried" in json && json.retried ? ` (${t("channelPublishRetried")})` : "";
        setMessage(
          `${t("channelPublishOk")}: ${json.channel_price_mxn} MXN${retried}`
        );
        await load();
      } else if (!ok && json.publish_status === "failed") {
        setError(`${t("channelPublishFail")}: ${json.error_code}`);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const pull = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    const ref = DEMO_REFS[shop.channel] ?? "demo-ref";
    try {
      const result = await pullShopListing(locale, shop.id, ref);
      setMessage(
        `${t("listingPulled")}: ${result.snapshot.external_item_id} → ${result.snapshot.price_mxn} MXN`
      );
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const syncListingJob = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    const listingId =
      shop.channel === "MERCADO_LIBRE" ? "listing-ml-001" : "listing-amz-001";
    const ref = DEMO_REFS[shop.channel] ?? "demo-ref";
    try {
      const result = await syncListingChannel(locale, listingId, ref);
      setMessage(
        `${t("listingSyncDone")}: ${result.job.id} → ${result.snapshot.price_mxn} MXN`
      );
    } catch (e) {
      setError(String(e));
    }
  };

  const channelLabel = (ch: string) =>
    ch === "MERCADO_LIBRE" ? t("mercadoLibre") : t("amazonMx");

  return (
    <div className="page page-wide">
      <h1>{t("channelsTitle")}</h1>
      <p className="hint">{t("channelsHint")}</p>
      {sandboxNote && (
        <p className="hint" data-testid="channel-sandbox-badge">
          {t("channelSandboxBadge")}: {sandboxNote}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}
      <div className="shop-actions">
        <button
          type="button"
          data-testid="channel-sandbox-status-export"
          onClick={() =>
            void downloadChannelSandboxStatusCsv(locale).then(() =>
              setMessage(t("channelSandboxStatusExportDone"))
            )
          }
        >
          {t("channelSandboxStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-shops-export"
          onClick={() =>
            void downloadShopsCsv(locale).then(() =>
              setMessage(t("shopsExportDone"))
            )
          }
        >
          {t("shopsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-shop-export"
          onClick={() =>
            void downloadShopCsv(locale, "shop-ml-demo").then(() =>
              setMessage(t("shopExportDone"))
            )
          }
        >
          {t("shopExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-export"
          onClick={() =>
            void downloadListingCsv(locale, "listing-ml-001").then(() =>
              setMessage(t("listingExportDone"))
            )
          }
        >
          {t("listingExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channel-listing-sync-export"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-ml-001"
            ).then(() => setMessage(t("channelListingSyncExportDone")))
          }
        >
          {t("channelListingSyncExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channel-listing-sync-export-amz"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-amz-001"
            ).then(() => setMessage(t("channelListingSyncAmzExportDone")))
          }
        >
          {t("channelListingSyncAmzExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-sync-ops-export"
          onClick={() =>
            void downloadListingSyncOpsStatusCsv(locale).then(() =>
              setMessage(t("channelsListingSyncOpsExportDone"))
            )
          }
        >
          {t("channelsListingSyncOpsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-reconciliation-direct-export"
          onClick={() =>
            void downloadReconciliationAlertsDirectCsv(locale).then(() =>
              setMessage(t("channelsReconciliationDirectExportDone"))
            )
          }
        >
          {t("channelsReconciliationDirectExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-tools-export"
          onClick={() =>
            void downloadAgentToolsCsv(locale).then(() =>
              setMessage(t("channelsAgentToolsExportDone"))
            )
          }
        >
          {t("channelsAgentToolsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-repricing-batch-summary-export"
          onClick={() =>
            void downloadRepricingBatchJobsSummaryCsv(locale).then(() =>
              setMessage(t("channelsRepricingBatchSummaryExportDone"))
            )
          }
        >
          {t("channelsRepricingBatchSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-ingest-status-export"
          onClick={() =>
            void downloadListingIngestStatusCsv(locale, "listing-ml-001").then(
              () => setMessage(t("channelsListingIngestStatusExportDone"))
            )
          }
        >
          {t("channelsListingIngestStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-feature-flags-export"
          onClick={() =>
            void downloadFeatureFlagsCsv(locale).then(() =>
              setMessage(t("channelsFeatureFlagsExportDone"))
            )
          }
        >
          {t("channelsFeatureFlagsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-competitor-anchor-amz-export"
          onClick={() =>
            void downloadCompetitorAnchorCsv(locale, "listing-amz-001").then(
              () => setMessage(t("channelsCompetitorAnchorAmzExportDone"))
            )
          }
        >
          {t("channelsCompetitorAnchorAmzExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-rule-compiler-export"
          onClick={() =>
            void downloadRuleCompilerStatusCsv(locale).then(() =>
              setMessage(t("channelsRuleCompilerExportDone"))
            )
          }
        >
          {t("channelsRuleCompilerExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-digest-jobs-summary-export"
          onClick={() =>
            void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
              setMessage(t("channelsDigestJobsSummaryExportDone"))
            )
          }
        >
          {t("channelsDigestJobsSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-auth-export"
          onClick={() =>
            void downloadAuthStatusCsv(locale).then(() =>
              setMessage(t("channelsAuthExportDone"))
            )
          }
        >
          {t("channelsAuthExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-digest-dlq-summary-export"
          onClick={() =>
            void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
              setMessage(t("channelsDigestDlqSummaryExportDone"))
            )
          }
        >
          {t("channelsDigestDlqSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-sync-schedule-export"
          onClick={() =>
            void downloadListingSyncScheduleCsv(locale).then(() =>
              setMessage(t("channelsListingSyncScheduleExportDone"))
            )
          }
        >
          {t("channelsListingSyncScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-milestones-export"
          onClick={() =>
            void downloadAgentMilestonesCsv(locale).then(() =>
              setMessage(t("channelsAgentMilestonesExportDone"))
            )
          }
        >
          {t("channelsAgentMilestonesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-adjustment-approval-policy-export"
          onClick={() =>
            void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
              setMessage(t("channelsAdjustmentApprovalPolicyExportDone"))
            )
          }
        >
          {t("channelsAdjustmentApprovalPolicyExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-ops-workers-summary-export"
          onClick={() =>
            void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
              setMessage(t("channelsOpsWorkersSummaryExportDone"))
            )
          }
        >
          {t("channelsOpsWorkersSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-pricing-snapshot-export"
          onClick={() =>
            void downloadPricingSnapshotCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("channelsPricingSnapshotExportDone"))
            )
          }
        >
          {t("channelsPricingSnapshotExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-cross-channel-guard-export"
          onClick={() =>
            void downloadCrossChannelGuardCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("channelsCrossChannelGuardExportDone"))
            )
          }
        >
          {t("channelsCrossChannelGuardExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-digest-schedule-export"
          onClick={() =>
            void downloadDigestScheduleCsv(locale).then(() =>
              setMessage(t("channelsDigestScheduleExportDone"))
            )
          }
        >
          {t("channelsDigestScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-dynamic-repricing-rule-export"
          onClick={() =>
            void downloadDynamicRepricingRuleCsv(
              locale,
              SHOP_LISTING_ID["shop-ml-demo"]
            ).then(() => setMessage(t("channelsDynamicRepricingRuleExportDone")))
          }
        >
          {t("channelsDynamicRepricingRuleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-repricing-queue-sku-export"
          onClick={() =>
            void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("channelsRepricingQueueSkuExportDone"))
            )
          }
        >
          {t("channelsRepricingQueueSkuExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-repricing-batch-shard-plan-export"
          onClick={() =>
            void downloadRepricingBatchShardPlanCsv(locale, DEMO_SKU, 2).then(
              () => setMessage(t("channelsRepricingBatchShardPlanExportDone"))
            )
          }
        >
          {t("channelsRepricingBatchShardPlanExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-sku-category-template-export"
          onClick={() =>
            void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("channelsSkuCategoryRuleTemplateExportDone"))
            )
          }
        >
          {t("channelsSkuCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-reconciliation-report-export"
          onClick={() =>
            void downloadReconciliationAlertsReportCsv(locale).then(() =>
              setMessage(t("channelsReconciliationReportExportDone"))
            )
          }
        >
          {t("channelsReconciliationReportExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-pricing-context-export"
          onClick={() =>
            void downloadPricingContextCsv(locale, "MERCADO_LIBRE", DEMO_SKU).then(
              () => setMessage(t("channelsPricingContextExportDone"))
            )
          }
        >
          {t("channelsPricingContextExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-repricing-batch-job-export"
          onClick={() =>
            void downloadLatestRepricingBatchJobCsv(locale)
              .then(() => setMessage(t("channelsRepricingBatchJobExportDone")))
              .catch(() => setMessage(t("channelsRepricingBatchJobExportEmpty")))
          }
        >
          {t("channelsRepricingBatchJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-category-rule-template-export"
          onClick={() =>
            void downloadCategoryRuleTemplateCsv(
              locale,
              "cat-electronics-mx"
            ).then(() => setMessage(t("channelsCategoryRuleTemplateExportDone")))
          }
        >
          {t("channelsCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-copilot-session-export"
          onClick={() =>
            void createCopilotSession(
              locale,
              "listing-ml-001",
              DEMO_SKU,
              "MERCADO_LIBRE"
            )
              .then((s) => downloadCopilotSessionCsv(locale, s.session_id))
              .then(() => setMessage(t("channelsCopilotSessionExportDone")))
          }
        >
          {t("channelsCopilotSessionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-price-version-export"
          onClick={() =>
            void downloadLatestQueuePriceVersionCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("channelsPriceVersionExportDone")))
              .catch(() => setMessage(t("channelsPriceVersionExportEmpty")))
          }
        >
          {t("channelsPriceVersionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-version-backup-csv"
          onClick={() =>
            void downloadVersionBackupCsv(locale).then(() =>
              setMessage(t("channelsVersionBackupCsvDone"))
            )
          }
        >
          {t("channelsVersionBackupCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-p5-readiness-export"
          onClick={() =>
            void downloadP5ReadinessCsv(locale).then(() =>
              setMessage(t("channelsP5ReadinessExportDone"))
            )
          }
        >
          {t("channelsP5ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-p3-readiness-export"
          onClick={() =>
            void downloadP3ReadinessCsv(locale).then(() =>
              setMessage(t("channelsP3ReadinessExportDone"))
            )
          }
        >
          {t("channelsP3ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-p4-readiness-export"
          onClick={() =>
            void downloadP4ReadinessCsv(locale).then(() =>
              setMessage(t("channelsP4ReadinessExportDone"))
            )
          }
        >
          {t("channelsP4ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-shared-fee-template-export"
          onClick={() =>
            void downloadSharedFeeTemplateCsv(
              locale,
              "fee-tpl-ml-electronics"
            ).then(() => setMessage(t("channelsSharedFeeTemplateExportDone")))
          }
        >
          {t("channelsSharedFeeTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-tenant-shared-fee-export"
          onClick={() =>
            void downloadTenantSharedFeeTemplatesCsv(locale, "tenant-demo").then(
              () => setMessage(t("channelsTenantSharedFeeTemplatesExportDone"))
            )
          }
        >
          {t("channelsTenantSharedFeeTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-sku-catalog-export"
          onClick={() =>
            void downloadSkuCatalogCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("channelsSkuCatalogExportDone"))
            )
          }
        >
          {t("channelsSkuCatalogExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-tariff-rate-export"
          onClick={() =>
            void downloadTariffHsRateCsv(locale, "HS-ELECTRONICS-MX").then(() =>
              setMessage(t("channelsTariffRateExportDone"))
            )
          }
        >
          {t("channelsTariffRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-fx-rate-export"
          onClick={() =>
            void downloadFxRateCsv(locale, "USD", "MXN").then(() =>
              setMessage(t("channelsFxRateExportDone"))
            )
          }
        >
          {t("channelsFxRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-cost-sheet-row-export"
          onClick={() =>
            void downloadLatestCostSheetCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("channelsCostSheetRowExportDone")))
              .catch(() => setMessage(t("channelsCostSheetRowExportEmpty")))
          }
        >
          {t("channelsCostSheetRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-competitor-offer-export"
          onClick={() =>
            void downloadFirstCompetitorOfferCsv(
              locale,
              SHOP_LISTING_ID["shop-ml-demo"]
            )
              .then(() => setMessage(t("channelsCompetitorOfferExportDone")))
              .catch(() => setMessage(t("channelsCompetitorOfferExportEmpty")))
          }
        >
          {t("channelsCompetitorOfferExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-reconciliation-alert-export"
          onClick={() =>
            void downloadFirstReconciliationAlertCsv(locale)
              .then(() => setMessage(t("channelsReconciliationAlertExportDone")))
              .catch(() => setMessage(t("channelsReconciliationAlertExportEmpty")))
          }
        >
          {t("channelsReconciliationAlertExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-sync-job-export"
          onClick={() =>
            void downloadLatestListingSyncJobCsv(locale)
              .then(() => setMessage(t("channelsListingSyncJobExportDone")))
              .catch(() => setMessage(t("channelsListingSyncJobExportEmpty")))
          }
        >
          {t("channelsListingSyncJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-digest-queued-job-export"
          onClick={() =>
            void downloadLatestDigestQueuedJobCsv(locale)
              .then(() => setMessage(t("channelsDigestQueuedJobExportDone")))
              .catch(() => setMessage(t("channelsDigestQueuedJobExportEmpty")))
          }
        >
          {t("channelsDigestQueuedJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-worker-heartbeat-export"
          onClick={() =>
            void downloadFirstWorkerHeartbeatCsv(locale)
              .then(() => setMessage(t("channelsWorkerHeartbeatExportDone")))
              .catch(() => setMessage(t("channelsWorkerHeartbeatExportEmpty")))
          }
        >
          {t("channelsWorkerHeartbeatExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-digest-dispatch-export"
          onClick={() =>
            void downloadLatestDigestDispatchCsv(locale)
              .then(() => setMessage(t("channelsDigestDispatchExportDone")))
              .catch(() => setMessage(t("channelsDigestDispatchExportEmpty")))
          }
        >
          {t("channelsDigestDispatchExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-digest-dead-letter-job-export"
          onClick={() =>
            void downloadFirstDigestDeadLetterJobCsv(locale)
              .then(() => setMessage(t("channelsDigestDeadLetterJobExportDone")))
              .catch(() => setMessage(t("channelsDigestDeadLetterJobExportEmpty")))
          }
        >
          {t("channelsDigestDeadLetterJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-tool-audit-row-export"
          onClick={() =>
            void downloadFirstAgentToolAuditRowCsv(locale)
              .then(() => setMessage(t("channelsAgentToolAuditRowExportDone")))
              .catch(() => setMessage(t("channelsAgentToolAuditRowExportEmpty")))
          }
        >
          {t("channelsAgentToolAuditRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-price-observation-export"
          onClick={() =>
            void downloadFirstPriceObservationCsv(
              locale,
              SHOP_LISTING_ID["shop-ml-demo"]
            )
              .then(() => setMessage(t("channelsPriceObservationExportDone")))
              .catch(() => setMessage(t("channelsPriceObservationExportEmpty")))
          }
        >
          {t("channelsPriceObservationExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-repricing-event-export"
          onClick={() =>
            void downloadLatestRepricingEventCsv(
              locale,
              SHOP_LISTING_ID["shop-ml-demo"]
            )
              .then(() => setMessage(t("channelsRepricingEventExportDone")))
              .catch(() => setMessage(t("channelsRepricingEventExportEmpty")))
          }
        >
          {t("channelsRepricingEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-adjustment-batch-index-export"
          onClick={() =>
            void downloadLatestAdjustmentBatchIndexCsv(locale)
              .then(() => setMessage(t("channelsAdjustmentBatchIndexExportDone")))
              .catch(() => setMessage(t("channelsAdjustmentBatchIndexExportEmpty")))
          }
        >
          {t("channelsAdjustmentBatchIndexExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-digest-date-export"
          onClick={() =>
            void downloadLatestAgentDigestDateCsv(locale)
              .then(() => setMessage(t("channelsAgentDigestDateExportDone")))
              .catch(() => setMessage(t("channelsAgentDigestDateExportEmpty")))
          }
        >
          {t("channelsAgentDigestDateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-pricing-row-export"
          onClick={() =>
            void downloadPricingSnapshotRowCsv(
              locale,
              DEMO_SKU,
              "MERCADO_LIBRE"
            )
              .then(() => setMessage(t("channelsPricingRowExportDone")))
              .catch(() => setMessage(t("channelsPricingRowExportEmpty")))
          }
        >
          {t("channelsPricingRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-cross-channel-row-export"
          onClick={() =>
            void downloadCrossChannelDashboardRowCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("channelsCrossChannelRowExportDone")))
              .catch(() => setMessage(t("channelsCrossChannelRowExportEmpty")))
          }
        >
          {t("channelsCrossChannelRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-curve-point-export"
          onClick={() =>
            void downloadLatestCompetitorCurvePointCsv(
              locale,
              SHOP_LISTING_ID["shop-ml-demo"]
            )
              .then(() => setMessage(t("channelsCurvePointExportDone")))
              .catch(() => setMessage(t("channelsCurvePointExportEmpty")))
          }
        >
          {t("channelsCurvePointExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-tool-row-export"
          onClick={() =>
            void downloadFirstAgentToolRowCsv(locale)
              .then(() => setMessage(t("channelsAgentToolRowExportDone")))
              .catch(() => setMessage(t("channelsAgentToolRowExportEmpty")))
          }
        >
          {t("channelsAgentToolRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-readiness-check-export"
          onClick={() =>
            void downloadFirstAgentReadinessCheckCsv(locale)
              .then(() => setMessage(t("channelsAgentReadinessCheckExportDone")))
              .catch(() => setMessage(t("channelsAgentReadinessCheckExportEmpty")))
          }
        >
          {t("channelsAgentReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-agent-milestone-export"
          onClick={() =>
            void downloadFirstAgentMilestoneCsv(locale)
              .then(() => setMessage(t("channelsAgentMilestoneExportDone")))
              .catch(() => setMessage(t("channelsAgentMilestoneExportEmpty")))
          }
        >
          {t("channelsAgentMilestoneExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-product-readiness-check-export"
          onClick={() =>
            void downloadFirstProductReadinessCheckCsv(locale)
              .then(() => setMessage(t("channelsProductReadinessCheckExportDone")))
              .catch(() => setMessage(t("channelsProductReadinessCheckExportEmpty")))
          }
        >
          {t("channelsProductReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-feature-flag-export"
          onClick={() =>
            void downloadFirstFeatureFlagCsv(locale)
              .then(() => setMessage(t("channelsFeatureFlagExportDone")))
              .catch(() => setMessage(t("channelsFeatureFlagExportEmpty")))
          }
        >
          {t("channelsFeatureFlagExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-i18n-glossary-export"
          onClick={() =>
            void downloadI18nGlossaryCsv(locale)
              .then(() => setMessage(t("channelsI18nGlossaryExportDone")))
              .catch(() => setMessage(t("channelsI18nGlossaryExportEmpty")))
          }
        >
          {t("channelsI18nGlossaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-i18n-glossary-term-export"
          onClick={() =>
            void downloadFirstI18nGlossaryTermCsv(locale)
              .then(() => setMessage(t("channelsI18nGlossaryTermExportDone")))
              .catch(() => setMessage(t("channelsI18nGlossaryTermExportEmpty")))
          }
        >
          {t("channelsI18nGlossaryTermExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-notification-templates-export"
          onClick={() =>
            void downloadNotificationTemplatesCsv(locale)
              .then(() => setMessage(t("channelsNotificationTemplatesExportDone")))
              .catch(() => setMessage(t("channelsNotificationTemplatesExportEmpty")))
          }
        >
          {t("channelsNotificationTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-notification-template-export"
          onClick={() =>
            void downloadFirstNotificationTemplateCsv(locale)
              .then(() => setMessage(t("channelsNotificationTemplateExportDone")))
              .catch(() => setMessage(t("channelsNotificationTemplateExportEmpty")))
          }
        >
          {t("channelsNotificationTemplateExportCsv")}
        </button>
      </div>

      {adapterStatus && (
        <section className="card" data-testid="channel-adapter-status">
          <h2>{t("channelAdapterTitle")}</h2>
          <p className="hint">{adapterStatus.note}</p>
          <dl className="adapter-status-dl">
            <div>
              <dt>{t("channelAdapterDriver")}</dt>
              <dd>
                <code data-testid="channel-adapter-driver">
                  {adapterStatus.driver}
                </code>
              </dd>
            </div>
            <div>
              <dt>{t("batchStatus")}</dt>
              <dd>
                <span
                  className={`status status-${adapterStatus.ready ? "connected" : "disconnected"}`}
                  data-testid="channel-adapter-ready"
                >
                  {adapterStatus.ready
                    ? t("channelAdapterReady")
                    : t("channelAdapterNotReady")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("channelAdapterPublishHttp")}</dt>
              <dd>
                {adapterStatus.publish_http_url_configured
                  ? t("channelAdapterConfigured")
                  : t("channelAdapterNotConfigured")}
              </dd>
            </div>
            <div>
              <dt>{t("channelAdapterPullHttp")}</dt>
              <dd>
                {adapterStatus.listing_pull_http_url_configured
                  ? t("channelAdapterConfigured")
                  : t("channelAdapterNotConfigured")}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            data-testid="channel-adapter-export"
            onClick={() =>
              void downloadChannelAdapterStatusCsv(locale).then(() =>
                setMessage(t("channelAdapterExportDone"))
              )
            }
          >
            {t("channelAdapterExportCsv")}
          </button>
        </section>
      )}

      <section className="card">
        <h2>{t("shopList")}</h2>
        <table className="batch-table shop-table" data-testid="shops-table">
          <thead>
            <tr>
              <th>{t("channel")}</th>
              <th>{t("shopName")}</th>
              <th>{t("batchStatus")}</th>
              <th>{t("shopSellerId")}</th>
              <th>{t("channelLastListingSyncCol")}</th>
              <th>{t("shopActions")}</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{channelLabel(shop.channel)}</td>
                <td>{shop.name}</td>
                <td>
                  <span className={`status status-${shop.auth_status}`}>
                    {shop.auth_status}
                  </span>
                </td>
                <td>{shop.external_seller_id ?? "—"}</td>
                <td>
                  {SHOP_LISTING_ID[shop.id] &&
                    lastSyncByListing[SHOP_LISTING_ID[shop.id]] && (
                      <span
                        className="hint"
                        data-testid={`channel-last-sync-${shop.id}`}
                      >
                        {t("channelLastListingSync", {
                          status:
                            lastSyncByListing[SHOP_LISTING_ID[shop.id]].status,
                          price:
                            lastSyncByListing[SHOP_LISTING_ID[shop.id]].price ??
                            "—",
                        })}
                      </span>
                    )}
                </td>
                <td className="shop-actions">
                  {shop.auth_status !== "connected" ? (
                    <button type="button" onClick={() => void connect(shop)}>
                      {t("connectShop")}
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => void pull(shop)}>
                        {t("pullListing")}
                      </button>
                      <button
                        type="button"
                        data-testid="listing-sync-run"
                        onClick={() => void syncListingJob(shop)}
                      >
                        {t("listingSyncRun")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void publishActive(shop)}
                      >
                        {t("publishToChannel")}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {sandboxNote && (
        <section className="card">
          <h2>{t("channelSandboxEventsTitle")}</h2>
          <div className="shop-actions">
            <button
              type="button"
              data-testid="channel-sandbox-export"
              onClick={() =>
                void downloadChannelSandboxEventsCsv(locale).then(() =>
                  setMessage(t("channelSandboxExportDone"))
                )
              }
            >
              {t("channelSandboxExportCsv")}
            </button>
            <button
              type="button"
              data-testid="channel-sandbox-event-export"
              disabled={!sandboxEvents[0]}
              onClick={() => {
                const eventId = sandboxEvents[0]?.id;
                if (!eventId) return;
                void downloadChannelSandboxEventCsv(locale, eventId).then(() =>
                  setMessage(t("channelSandboxEventExportDone"))
                );
              }}
            >
              {t("channelSandboxEventExportCsv")}
            </button>
          </div>
          {sandboxEvents.length === 0 ? (
            <p className="hint" data-testid="channel-sandbox-events-empty">
              {t("channelSandboxNoEvents")}
            </p>
          ) : (
            <table
              className="batch-table shop-table"
              data-testid="channel-sandbox-events"
            >
              <thead>
                <tr>
                  <th>{t("channelSandboxEventTime")}</th>
                  <th>{t("channelSandboxEventType")}</th>
                  <th>{t("channel")}</th>
                  <th>{t("channelSandboxListing")}</th>
                </tr>
              </thead>
              <tbody>
                {sandboxEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.created_at).toLocaleString(locale)}</td>
                    <td>
                      <code>{ev.event_type}</code>
                    </td>
                    <td>{channelLabel(ev.channel)}</td>
                    <td>{ev.listing_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
