import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  batchChannelPublish,
  DEMO_SKU,
  downloadPricingSnapshotCsv,
  downloadPricingSnapshotRowCsv,
  downloadTenantPricingSnapshotsCsv,
  downloadVersionBackup,
  downloadVersionBackupCsv,
  downloadPriceVersionCsv,
  fetchOpsMetrics,
  fetchWorkerStatus,
  importCostSheetsCsv,
  importLandedCostCsv,
  fetchListingSyncSchedule,
  updateListingSyncSchedule,
  runListingSyncDue,
  fetchListingSyncJobs,
  fetchListingSyncOpsStatus,
  downloadListingSyncJobsCsv,
  downloadListingSyncJobsForListingCsv,
  downloadListingSyncJobCsv,
  downloadListingSyncOpsStatusCsv,
  downloadListingSyncScheduleCsv,
  downloadReconciliationAlertsDirectCsv,
  downloadReconciliationAlertCsv,
  downloadReconciliationAlertsExport,
  downloadReconciliationAlertsReportCsv,
  downloadRepricingBatchJobsCsv,
  downloadRepricingBatchJobsSummaryCsv,
  downloadListingIngestStatusCsv,
  downloadFeatureFlagsCsv,
  downloadLatestRepricingBatchJobCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadRepricingQueueCsv,
  downloadSkuRepricingQueueCsv,
  downloadWorkerHeartbeatsCsv,
  downloadWorkerHeartbeatCsv,
  downloadOpsWorkersStatusSummaryCsv,
  downloadOpsMetricsCsv,
  fetchRepricingBatchJobsSummary,
  type ListingSyncJobRow,
  fetchReconciliationAlerts,
  fetchRepricingQueue,
  fetchTariffHsRates,
  previewAdjustmentPricesCsv,
  previewLandedCostFromHs,
  downloadTariffHsRatesCsv,
  downloadTariffHsRateCsv,
  downloadFxRatesCsv,
  downloadFxRateCsv,
  downloadAuthStatusCsv,
  downloadAgentToolsCsv,
  downloadAgentReadinessCsv,
  downloadProductReadinessCsv,
  downloadCompetitorAnchorCsv,
  downloadNotificationTemplatesCsv,
  downloadNotificationTemplateCsv,
  fetchNotificationInbox,
  markNotificationRead,
  downloadNotificationInboxCsv,
  type NotificationInboxItem,
  downloadDigestQueuedJobsSummaryCsv,
  downloadLatestDigestQueuedJobCsv,
  downloadLatestDigestDispatchCsv,
  downloadFirstChannelSandboxEventCsv,
  downloadFirstDigestDeadLetterJobCsv,
  downloadFirstAgentToolAuditRowCsv,
  downloadFirstPriceObservationCsv,
  downloadLatestRepricingEventCsv,
  downloadLatestAdjustmentBatchIndexCsv,
  downloadLatestAgentDigestDateCsv,
  downloadCrossChannelDashboardRowCsv,
  downloadLatestCompetitorCurvePointCsv,
  downloadFirstAgentToolRowCsv,
  downloadFirstAgentReadinessCheckCsv,
  downloadFirstAgentMilestoneCsv,
  downloadFirstProductReadinessCheckCsv,
  downloadFirstFeatureFlagCsv,
  downloadI18nGlossaryCsv,
  downloadFirstI18nGlossaryTermCsv,
  downloadChannelAdapterStatusCsv,
  downloadRuleCompilerStatusCsv,
  downloadChannelSandboxStatusCsv,
  downloadDigestDeadLetterSummaryCsv,
  downloadAgentMilestonesCsv,
  downloadAdjustmentApprovalPolicyCsv,
  downloadCrossChannelGuardCsv,
  downloadDigestScheduleCsv,
  downloadDynamicRepricingRuleCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadPricingContextCsv,
  downloadCategoryRuleTemplateCsv,
  createCopilotSession,
  downloadCopilotSessionCsv,
  downloadP5ReadinessCsv,
  downloadP3ReadinessCsv,
  downloadP4ReadinessCsv,
  downloadSharedFeeTemplateCsv,
  downloadTenantSharedFeeTemplatesCsv,
  downloadSkuCatalogCsv,
  downloadListingCsv,
  downloadLatestCostSheetCsv,
  downloadFirstCompetitorOfferCsv,
  downloadShopCsv,
  promoteRepricingToPending,
  reconcileListing,
  type OpsMetricsSnapshot,
  type ReconciliationAlert,
  type RepricingQueueItem,
  type TariffHsRow,
} from "../api/client";
import { OpsMetricsCard } from "./OpsMetricsCard";
import { OpsRepricingQueueTable } from "./OpsRepricingQueueTable";
import { PageIntent } from "@/components/patterns/PageIntent";
import { AdvancedSection } from "@/components/patterns/AdvancedSection";
import { ExportHub } from "@/components/patterns/ExportHub";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
} from "@/components/patterns/DataTable";
import { Surface } from "@/components/primitives/Surface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const DEMO_LISTINGS = ["listing-ml-001", "listing-amz-001"];
const RECON_REFS: Record<string, string> = {
  "listing-ml-001": "MLM123456",
  "listing-amz-001": "B0TEST123",
};

export function OpsCenterPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [items, setItems] = useState<RepricingQueueItem[]>([]);
  const [alerts, setAlerts] = useState<ReconciliationAlert[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<OpsMetricsSnapshot | null>(null);
  const [importCsv, setImportCsv] = useState(
    "sku_id,landed_cost_mxn\ndemo-sku-001,1050"
  );
  const [costSheetImportCsv, setCostSheetImportCsv] = useState(
    "sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn\ndemo-sku-001,BATCH-CSV,1000,MXN,0\n"
  );
  const [adjustmentCsv, setAdjustmentCsv] = useState(
    "listing_id,explicit_price_mxn\nlisting-ml-001,1600\n"
  );
  const [tariffRows, setTariffRows] = useState<TariffHsRow[]>([]);
  const [workerCount, setWorkerCount] = useState(0);
  const [primaryWorkerId, setPrimaryWorkerId] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncCron, setSyncCron] = useState("0 */6 * * *");
  const [syncLastRun, setSyncLastRun] = useState<string | null>(null);
  const [syncJobs, setSyncJobs] = useState<ListingSyncJobRow[]>([]);
  const [syncJobOk, setSyncJobOk] = useState(0);
  const [syncJobFailed, setSyncJobFailed] = useState(0);
  const [repricingBatchQueued, setRepricingBatchQueued] = useState(0);
  const [repricingBatchDriver, setRepricingBatchDriver] = useState("memory");
  const [notifications, setNotifications] = useState<NotificationInboxItem[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [data, alertData, ops, workers, tariffs, syncSchedule, syncJobFeed, syncStatus, repricingBatch, inbox] =
        await Promise.all([
        fetchRepricingQueue(locale, DEMO_SKU),
        fetchReconciliationAlerts(locale),
        fetchOpsMetrics(locale),
        fetchWorkerStatus(locale),
        fetchTariffHsRates(locale),
        fetchListingSyncSchedule(locale),
        fetchListingSyncJobs(locale, 8),
        fetchListingSyncOpsStatus(locale),
        fetchRepricingBatchJobsSummary(locale),
        fetchNotificationInbox(locale),
      ]);
      setItems(data.items);
      setAlerts(alertData.items);
      setMetrics(ops);
      setTariffRows(tariffs.items);
      setWorkerCount(workers.workers.filter((w) => !w.stale).length);
      setPrimaryWorkerId(workers.workers[0]?.worker_id ?? null);
      setSyncEnabled(syncSchedule.enabled);
      setSyncCron(syncSchedule.cron_expression);
      setSyncLastRun(syncSchedule.last_run_at);
      setSyncJobs(syncJobFeed.items);
      setSyncJobOk(syncStatus.job_summary.ok);
      setSyncJobFailed(syncStatus.job_summary.failed);
      setRepricingBatchQueued(repricingBatch.summary.queued);
      setRepricingBatchDriver(repricingBatch.driver);
      setNotifications(inbox.items);
      setSelected(
        new Set(
          data.items.filter((i) => i.state === "suggested").map((i) => i.version_id)
        )
      );
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (versionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) next.delete(versionId);
      else next.add(versionId);
      return next;
    });
  };

  const promote = async () => {
    setError(null);
    setMessage(null);
    const ids = [...selected].filter((id) =>
      items.some((i) => i.version_id === id && i.state === "suggested")
    );
    if (ids.length === 0) {
      setError(t("opsSelectSuggested"));
      return;
    }
    try {
      const result = await promoteRepricingToPending(locale, ids);
      setMessage(
        t("opsPromoted", { count: result.updated.length, skipped: result.skipped.length })
      );
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const runReconcile = async () => {
    setError(null);
    setMessage(null);
    try {
      for (const listingId of DEMO_LISTINGS) {
        await reconcileListing(locale, listingId, RECON_REFS[listingId]);
      }
      setMessage(t("opsReconcileDone"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const publishBatch = async () => {
    setError(null);
    setMessage(null);
    try {
      const { ok, json } = await batchChannelPublish(locale, DEMO_LISTINGS);
      if (json.publish_status === "all_published") {
        setMessage(t("opsBatchAllPublished"));
      } else if (json.publish_status === "partial_success") {
        setMessage(t("opsBatchPartial"));
      } else {
        setError(t("opsBatchFailed"));
      }
      if (!ok && json.publish_status !== "partial_success") {
        return;
      }
      void load();
    } catch (e) {
      setError(String(e));
    }
  };

  const channelLabel = (ch: string) =>
    ch === "MERCADO_LIBRE" ? t("mercadoLibre") : t("amazonMx");

  return (
    <div className="space-y-4">
      <PageIntent
        title={t("opsTitle")}
        description={t("opsHint")}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => void promote()}>
              {t("opsPromotePending")}
            </Button>
            <Button type="button" size="sm" onClick={() => void publishBatch()}>
              {t("opsBatchPublish")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void runReconcile()}>
              {t("opsRunReconcile")}
            </Button>
          </>
        }
      />
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {metrics && (
        <OpsMetricsCard
          metrics={metrics}
          repricingBatchQueued={repricingBatchQueued}
          repricingBatchDriver={repricingBatchDriver}
          onExport={() =>
            void downloadOpsMetricsCsv(locale).then(() =>
              setMessage(t("opsMetricsExportDone"))
            )
          }
        />
      )}

      <OpsRepricingQueueTable
        items={items}
        selected={selected}
        onToggle={toggle}
        channelLabel={channelLabel}
        locale={locale}
        toolbar={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="ops-repricing-queue-export"
              onClick={() =>
                void downloadRepricingQueueCsv(locale).then(() =>
                  setMessage(t("opsRepricingQueueExportDone"))
                )
              }
            >
              {t("opsRepricingQueueExportCsv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="ops-repricing-queue-sku-export"
              onClick={() =>
                void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
                  setMessage(t("opsRepricingQueueSkuExportDone"))
                )
              }
            >
              {t("opsRepricingQueueSkuExportCsv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="ops-price-version-export"
              disabled={items.length === 0}
              onClick={() =>
                items[0]
                  ? void downloadPriceVersionCsv(locale, items[0].version_id).then(
                      () => setMessage(t("opsPriceVersionExportDone"))
                    )
                  : undefined
              }
            >
              {t("opsPriceVersionExportCsv")}
            </Button>
          </>
        }
      />

      <Surface variant="elevated" padding="md" className="mb-6 space-y-4" data-testid="ops-notification-inbox">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("opsNotificationInboxTitle")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="ops-notification-inbox-export"
            onClick={() =>
              void downloadNotificationInboxCsv(locale).then(() =>
                setMessage(t("opsNotificationInboxExportDone"))
              )
            }
          >
            {t("opsNotificationInboxExportCsv")}
          </Button>
        </div>
        <DataTable
          testId="ops-notification-inbox-table"
          isEmpty={notifications.length === 0}
          emptyMessage={t("opsNotificationInboxEmpty")}
          maxHeight={280}
          className="border-0 shadow-none ring-0"
        >
          <DataTableRoot>
            <DataTableHeader>
              <DataTableRow className="hover:bg-transparent">
                <DataTableHead>{t("opsNotificationSubject")}</DataTableHead>
                <DataTableHead>{t("opsNotificationEvent")}</DataTableHead>
                <DataTableHead>{t("batchCreated")}</DataTableHead>
                <DataTableHead />
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {notifications.map((n) => (
                <DataTableRow key={n.id} className={n.read_at ? "opacity-60" : undefined}>
                  <DataTableCell>
                    <div className="font-medium">{n.subject}</div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                  </DataTableCell>
                  <DataTableCell className="font-mono text-xs">{n.event}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {new Date(n.created_at).toLocaleString(locale)}
                  </DataTableCell>
                  <DataTableCell>
                    {!n.read_at && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-testid={`ops-notification-read-${n.id}`}
                        onClick={() =>
                          void markNotificationRead(locale, n.id).then(() => load())
                        }
                      >
                        {t("opsNotificationMarkRead")}
                      </Button>
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTableRoot>
        </DataTable>
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-6">
        <h2 className="mb-4 text-base font-semibold">{t("opsReconAlerts")}</h2>
        <DataTable
          testId="reconciliation-alerts-table"
          isEmpty={alerts.length === 0}
          emptyMessage={t("opsReconEmpty")}
          maxHeight={280}
          className="border-0 shadow-none ring-0"
        >
          <DataTableRoot>
            <DataTableHeader>
              <DataTableRow className="hover:bg-transparent">
                <DataTableHead>{t("channel")}</DataTableHead>
                <DataTableHead>{t("opsReconActive")}</DataTableHead>
                <DataTableHead>{t("opsReconChannel")}</DataTableHead>
                <DataTableHead>{t("opsReconDelta")}</DataTableHead>
                <DataTableHead>{t("batchCreated")}</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {alerts.map((a) => (
                <DataTableRow key={a.id}>
                  <DataTableCell>{channelLabel(a.channel)}</DataTableCell>
                  <DataTableCell className="font-mono tabular-nums">{a.active_price_mxn}</DataTableCell>
                  <DataTableCell className="font-mono tabular-nums">{a.channel_price_mxn}</DataTableCell>
                  <DataTableCell className="font-mono tabular-nums">{a.delta_mxn}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleString(locale)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTableRoot>
        </DataTable>
      </Surface>

      <AdvancedSection title={t("advancedSection")} description={t("opsAdvancedHint")}>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4">
        <button
          type="button"
          data-testid="ops-export-pricing-csv"
          onClick={() => void downloadPricingSnapshotCsv(locale, DEMO_SKU)}
        >
          {t("opsExportPricingCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-export-tenant-pricing-csv"
          onClick={() =>
            void downloadTenantPricingSnapshotsCsv(locale).then(() =>
              setMessage(t("opsTenantPricingExportDone"))
            )
          }
        >
          {t("opsTenantPricingExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-export-pricing-row-csv"
          onClick={() =>
            void downloadPricingSnapshotRowCsv(
              locale,
              DEMO_SKU,
              "MERCADO_LIBRE"
            ).then(() => setMessage(t("opsPricingRowExportDone")))
          }
        >
          {t("opsPricingRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-version-backup"
          onClick={() => void downloadVersionBackup(locale)}
        >
          {t("opsVersionBackup")}
        </button>
        <button
          type="button"
          data-testid="ops-version-backup-csv"
          onClick={() =>
            void downloadVersionBackupCsv(locale).then(() =>
              setMessage(t("opsVersionBackupCsvDone"))
            )
          }
        >
          {t("opsVersionBackupCsv")}
        </button>
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="ops-listing-sync-schedule">
        <h2 className="text-base font-semibold">{t("opsListingSyncSchedule")}</h2>
        <label>
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.target.checked)}
          />
          {t("opsListingSyncEnabled")}
        </label>
        <label>
          {t("opsListingSyncCron")}
          <input
            type="text"
            value={syncCron}
            onChange={(e) => setSyncCron(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
        </label>
        <p className="text-sm text-muted-foreground" data-testid="ops-listing-sync-summary">
          {t("opsListingSyncSummary", {
            ok: syncJobOk,
            failed: syncJobFailed,
            sampled: syncJobOk + syncJobFailed,
          })}
        </p>
        <p className="text-sm text-muted-foreground" data-testid="ops-listing-sync-last-run">
          {t("opsListingSyncLastRun")}:{" "}
          {syncLastRun ? new Date(syncLastRun).toLocaleString(locale) : "—"}
        </p>
        <button
          type="button"
          onClick={() =>
            void updateListingSyncSchedule(locale, {
              enabled: syncEnabled,
              cron_expression: syncCron,
            }).then(() => setMessage(t("policySaved")))
          }
        >
          {t("opsListingSyncSave")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-run-force"
          onClick={() =>
            void runListingSyncDue(locale, true)
              .then((r) => {
                setMessage(
                  t("opsListingSyncRunDone", { count: r.runs.length })
                );
                return load();
              })
              .catch((e) => setError(String(e)))
          }
        >
          {t("opsListingSyncRunForce")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-run-due"
          onClick={() =>
            void runListingSyncDue(locale)
              .then((r) =>
                setMessage(
                  t("opsListingSyncRunDone", { count: r.runs.length })
                )
              )
              .catch(() => setError(t("opsListingSyncDisabled")))
          }
        >
          {t("opsListingSyncRunDue")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-schedule-export"
          onClick={() =>
            void downloadListingSyncScheduleCsv(locale).then(() =>
              setMessage(t("opsListingSyncScheduleExportDone"))
            )
          }
        >
          {t("opsListingSyncScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-export"
          onClick={() =>
            void downloadListingSyncJobsCsv(locale).then(() =>
              setMessage(t("opsListingSyncExportDone"))
            )
          }
        >
          {t("opsListingSyncExportJobs")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-job-export"
          disabled={!syncJobs[0]}
          onClick={() => {
            const job = syncJobs[0];
            if (!job) return;
            void downloadListingSyncJobCsv(locale, job.id).then(() =>
              setMessage(t("opsListingSyncJobExportDone"))
            );
          }}
        >
          {t("opsListingSyncJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-status-export"
          onClick={() =>
            void downloadListingSyncOpsStatusCsv(locale).then(() =>
              setMessage(t("opsListingSyncStatusExportDone"))
            )
          }
        >
          {t("opsListingSyncStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-sync-amz-export"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-amz-001"
            ).then(() => setMessage(t("opsListingSyncAmzExportDone")))}
        >
          {t("opsListingSyncAmzExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-reconciliation-export"
          onClick={() =>
            void downloadReconciliationAlertsExport(locale).then(() =>
              setMessage(t("opsReconciliationExportDone"))
            )
          }
        >
          {t("opsReconciliationExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-reconciliation-direct-export"
          onClick={() =>
            void downloadReconciliationAlertsDirectCsv(locale).then(() =>
              setMessage(t("opsReconciliationDirectExportDone"))
            )
          }
        >
          {t("opsReconciliationDirectExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-reconciliation-report-export"
          onClick={() =>
            void downloadReconciliationAlertsReportCsv(locale).then(() =>
              setMessage(t("opsReconciliationReportExportDone"))
            )
          }
        >
          {t("opsReconciliationReportExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-reconciliation-alert-export"
          disabled={!alerts[0]}
          onClick={() => {
            const alert = alerts[0];
            if (!alert) return;
            void downloadReconciliationAlertCsv(locale, alert.id).then(() =>
              setMessage(t("opsReconciliationAlertExportDone"))
            );
          }}
        >
          {t("opsReconciliationAlertExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-repricing-batch-export"
          onClick={() =>
            void downloadRepricingBatchJobsCsv(locale).then(() =>
              setMessage(t("opsRepricingBatchExportDone"))
            )
          }
        >
          {t("opsRepricingBatchExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-repricing-batch-job-export"
          onClick={() =>
            void downloadLatestRepricingBatchJobCsv(locale)
              .then(() => setMessage(t("opsRepricingBatchJobExportDone")))
              .catch(() => setError(t("opsRepricingBatchJobExportEmpty")))
          }
        >
          {t("opsRepricingBatchJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-repricing-batch-shard-plan-export"
          onClick={() =>
            void downloadRepricingBatchShardPlanCsv(locale, DEMO_SKU, 2).then(
              () => setMessage(t("opsRepricingBatchShardPlanExportDone"))
            )
          }
        >
          {t("opsRepricingBatchShardPlanExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-repricing-batch-summary-export"
          onClick={() =>
            void downloadRepricingBatchJobsSummaryCsv(locale).then(() =>
              setMessage(t("opsRepricingBatchSummaryExportDone"))
            )
          }
        >
          {t("opsRepricingBatchSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-ingest-status-export"
          onClick={() =>
            void downloadListingIngestStatusCsv(locale, "listing-ml-001").then(
              () => setMessage(t("listingIngestStatusExportDone"))
            )
          }
        >
          {t("opsListingIngestStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-feature-flags-export"
          onClick={() =>
            void downloadFeatureFlagsCsv(locale).then(() =>
              setMessage(t("readinessFeatureFlagsExportDone"))
            )
          }
        >
          {t("opsFeatureFlagsExportCsv")}
        </button>
        {syncJobs.length > 0 && (
          <DataTable testId="ops-listing-sync-jobs" maxHeight={280}>
            <DataTableRoot>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>{t("opsListingSyncJobListing")}</DataTableHead>
                  <DataTableHead>{t("batchStatus")}</DataTableHead>
                  <DataTableHead>{t("opsListingSyncJobPrice")}</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {syncJobs.map((j) => (
                  <DataTableRow key={j.id}>
                    <DataTableCell>
                      <code className="text-xs">{j.listing_id}</code>
                    </DataTableCell>
                    <DataTableCell>{j.status}</DataTableCell>
                    <DataTableCell className="tabular-nums">
                      {j.channel_price_mxn != null
                        ? `${j.channel_price_mxn} MXN`
                        : "—"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTableRoot>
          </DataTable>
        )}
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="ops-landed-cost-import">
        <h2 className="text-base font-semibold">{t("opsLandedCostImport")}</h2>
        <p className="text-sm text-muted-foreground">{t("opsLandedCostImportHint")}</p>
        <textarea
          rows={3}
          value={importCsv}
          onChange={(e) => setImportCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={() =>
            void importLandedCostCsv(locale, importCsv).then((r) =>
              setMessage(
                t("opsLandedCostImportDone", { count: r.updated.length })
              )
            )
          }
        >
          {t("opsLandedCostImportRun")}
        </button>
        {workerCount > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="ops-workers-live">
            {t("opsWorkersLive", { count: workerCount })}
          </p>
        )}
        <button
          type="button"
          data-testid="ops-workers-summary-export"
          onClick={() =>
            void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
              setMessage(t("opsWorkersSummaryExportDone"))
            )
          }
        >
          {t("opsWorkersSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-workers-export"
          onClick={() =>
            void downloadWorkerHeartbeatsCsv(locale).then(() =>
              setMessage(t("opsWorkersExportDone"))
            )
          }
        >
          {t("opsWorkersExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-worker-heartbeat-export"
          disabled={!primaryWorkerId}
          onClick={() => {
            if (!primaryWorkerId) return;
            void downloadWorkerHeartbeatCsv(locale, primaryWorkerId).then(() =>
              setMessage(t("opsWorkerHeartbeatExportDone"))
            );
          }}
        >
          {t("opsWorkerHeartbeatExportCsv")}
        </button>
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="ops-cost-sheet-import">
        <h2 className="text-base font-semibold">{t("opsCostSheetImport")}</h2>
        <textarea
          rows={3}
          value={costSheetImportCsv}
          onChange={(e) => setCostSheetImportCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={() =>
            void importCostSheetsCsv(locale, costSheetImportCsv).then((r) =>
              setMessage(t("opsCostSheetImportDone", { count: r.created.length }))
            )
          }
        >
          {t("opsCostSheetImportRun")}
        </button>
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="ops-tariff-hs">
        <h2 className="text-base font-semibold">{t("opsTariffHs")}</h2>
        <DataTable testId="ops-tariff-table" maxHeight={240}>
          <DataTableRoot>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>HS</DataTableHead>
                <DataTableHead>{t("opsTariffRate")}</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {tariffRows.map((row) => (
                <DataTableRow key={row.hs_code}>
                  <DataTableCell>
                    <code className="text-xs">{row.hs_code}</code>
                  </DataTableCell>
                  <DataTableCell>{(row.tariff_rate * 100).toFixed(1)}%</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTableRoot>
        </DataTable>
        <button
          type="button"
          data-testid="ops-hs-landed-preview"
          onClick={() =>
            void previewLandedCostFromHs(locale, DEMO_SKU, 1000).then((r) =>
              setMessage(
                t("opsHsLandedPreviewDone", {
                  hs: r.hs_code,
                  landed: r.computed.landed_cost_mxn,
                })
              )
            )
          }
        >
          {t("opsHsLandedPreview")}
        </button>
        <button
          type="button"
          data-testid="ops-tariff-export"
          onClick={() =>
            void downloadTariffHsRatesCsv(locale).then(() =>
              setMessage(t("opsTariffExportDone"))
            )
          }
        >
          {t("opsTariffExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-tariff-rate-export"
          onClick={() =>
            void downloadTariffHsRateCsv(locale, "HS-ELECTRONICS-MX").then(() =>
              setMessage(t("opsTariffRateExportDone"))
            )
          }
        >
          {t("opsTariffRateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-fx-export"
          onClick={() =>
            void downloadFxRatesCsv(locale).then(() =>
              setMessage(t("opsFxExportDone"))
            )
          }
        >
          {t("opsFxExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-fx-rate-export"
          onClick={() =>
            void downloadFxRateCsv(locale, "USD", "MXN").then(() =>
              setMessage(t("opsFxRateExportDone"))
            )
          }
        >
          {t("opsFxRateExportCsv")}
        </button>
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="ops-adjustment-preview">
        <h2 className="text-base font-semibold">{t("opsAdjustmentPreview")}</h2>
        <p className="text-sm text-muted-foreground">{t("opsAdjustmentPreviewHint")}</p>
        <textarea
          rows={3}
          value={adjustmentCsv}
          onChange={(e) => setAdjustmentCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={() =>
            void previewAdjustmentPricesCsv(locale, adjustmentCsv).then((r) =>
              setMessage(
                t("opsAdjustmentPreviewDone", {
                  status: r.preview.status,
                  count: r.preview.items.length,
                })
              )
            )
          }
        >
          {t("opsAdjustmentPreviewRun")}
        </button>
      </Surface>

        <ExportHub title={t("exportActions")} description={t("exportHubHint")}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="ops-auth-export"
          onClick={() =>
            void downloadAuthStatusCsv(locale).then(() =>
              setMessage(t("opsAuthExportDone"))
            )
          }
        >
          {t("opsAuthExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-notification-templates-export"
          onClick={() =>
            void downloadNotificationTemplatesCsv(locale).then(() =>
              setMessage(t("opsNotificationTemplatesExportDone"))
            )
          }
        >
          {t("opsNotificationTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-notification-template-export"
          onClick={() =>
            void downloadNotificationTemplateCsv(
              locale,
              "repricing.competitor_price_changed"
            ).then(() => setMessage(t("opsNotificationTemplateExportDone")))
          }
        >
          {t("opsNotificationTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-tools-export"
          onClick={() =>
            void downloadAgentToolsCsv(locale).then(() =>
              setMessage(t("opsAgentToolsExportDone"))
            )
          }
        >
          {t("opsAgentToolsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-readiness-export"
          onClick={() =>
            void downloadAgentReadinessCsv(locale).then(() =>
              setMessage(t("opsAgentReadinessExportDone"))
            )
          }
        >
          {t("opsAgentReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-product-readiness-export"
          onClick={() =>
            void downloadProductReadinessCsv(locale).then(() =>
              setMessage(t("opsProductReadinessExportDone"))
            )
          }
        >
          {t("opsProductReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-competitor-anchor-export"
          onClick={() =>
            void downloadCompetitorAnchorCsv(locale, "listing-ml-001").then(() =>
              setMessage(t("opsCompetitorAnchorExportDone"))
            )
          }
        >
          {t("opsCompetitorAnchorExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-digest-jobs-summary-export"
          onClick={() =>
            void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
              setMessage(t("opsDigestJobsSummaryExportDone"))
            )
          }
        >
          {t("opsDigestJobsSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-digest-queued-job-export"
          onClick={() =>
            void downloadLatestDigestQueuedJobCsv(locale)
              .then(() => setMessage(t("opsDigestQueuedJobExportDone")))
              .catch(() => setMessage(t("opsDigestQueuedJobExportEmpty")))
          }
        >
          {t("opsDigestQueuedJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-channel-adapter-export"
          onClick={() =>
            void downloadChannelAdapterStatusCsv(locale).then(() =>
              setMessage(t("opsChannelAdapterExportDone"))
            )
          }
        >
          {t("opsChannelAdapterExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-rule-compiler-export"
          onClick={() =>
            void downloadRuleCompilerStatusCsv(locale).then(() =>
              setMessage(t("opsRuleCompilerExportDone"))
            )
          }
        >
          {t("opsRuleCompilerExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-channel-sandbox-status-export"
          onClick={() =>
            void downloadChannelSandboxStatusCsv(locale).then(() =>
              setMessage(t("opsChannelSandboxStatusExportDone"))
            )
          }
        >
          {t("opsChannelSandboxStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-digest-dlq-summary-export"
          onClick={() =>
            void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
              setMessage(t("opsDigestDlqSummaryExportDone"))
            )
          }
        >
          {t("opsDigestDlqSummaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-milestones-export"
          onClick={() =>
            void downloadAgentMilestonesCsv(locale).then(() =>
              setMessage(t("opsAgentMilestonesExportDone"))
            )
          }
        >
          {t("opsAgentMilestonesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-adjustment-approval-policy-export"
          onClick={() =>
            void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
              setMessage(t("opsAdjustmentApprovalPolicyExportDone"))
            )
          }
        >
          {t("opsAdjustmentApprovalPolicyExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-cross-channel-guard-export"
          onClick={() =>
            void downloadCrossChannelGuardCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("opsCrossChannelGuardExportDone"))
            )
          }
        >
          {t("opsCrossChannelGuardExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-digest-schedule-export"
          onClick={() =>
            void downloadDigestScheduleCsv(locale).then(() =>
              setMessage(t("opsDigestScheduleExportDone"))
            )
          }
        >
          {t("opsDigestScheduleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-dynamic-repricing-rule-export"
          onClick={() =>
            void downloadDynamicRepricingRuleCsv(locale, DEMO_LISTINGS[0]).then(
              () => setMessage(t("opsDynamicRepricingRuleExportDone"))
            )
          }
        >
          {t("opsDynamicRepricingRuleExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-sku-category-template-export"
          onClick={() =>
            void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("opsSkuCategoryRuleTemplateExportDone"))
            )
          }
        >
          {t("opsSkuCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-pricing-context-export"
          onClick={() =>
            void downloadPricingContextCsv(locale, "MERCADO_LIBRE", DEMO_SKU).then(
              () => setMessage(t("opsPricingContextExportDone"))
            )
          }
        >
          {t("opsPricingContextExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-category-rule-template-export"
          onClick={() =>
            void downloadCategoryRuleTemplateCsv(
              locale,
              "cat-electronics-mx"
            ).then(() => setMessage(t("opsCategoryRuleTemplateExportDone")))
          }
        >
          {t("opsCategoryRuleTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-copilot-session-export"
          onClick={() =>
            void createCopilotSession(
              locale,
              DEMO_LISTINGS[0],
              DEMO_SKU,
              "MERCADO_LIBRE"
            )
              .then((s) => downloadCopilotSessionCsv(locale, s.session_id))
              .then(() => setMessage(t("opsCopilotSessionExportDone")))
          }
        >
          {t("opsCopilotSessionExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-p5-readiness-export"
          onClick={() =>
            void downloadP5ReadinessCsv(locale).then(() =>
              setMessage(t("opsP5ReadinessExportDone"))
            )
          }
        >
          {t("opsP5ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-pricing-snapshot-export"
          onClick={() =>
            void downloadPricingSnapshotCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("opsPricingSnapshotExportDone"))
            )
          }
        >
          {t("opsPricingSnapshotExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-shop-export"
          onClick={() =>
            void downloadShopCsv(locale, "shop-ml-demo").then(() =>
              setMessage(t("opsShopExportDone"))
            )
          }
        >
          {t("opsShopExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-p3-readiness-export"
          onClick={() =>
            void downloadP3ReadinessCsv(locale).then(() =>
              setMessage(t("opsP3ReadinessExportDone"))
            )
          }
        >
          {t("opsP3ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-p4-readiness-export"
          onClick={() =>
            void downloadP4ReadinessCsv(locale).then(() =>
              setMessage(t("opsP4ReadinessExportDone"))
            )
          }
        >
          {t("opsP4ReadinessExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-shared-fee-template-export"
          onClick={() =>
            void downloadSharedFeeTemplateCsv(
              locale,
              "fee-tpl-ml-electronics"
            ).then(() => setMessage(t("opsSharedFeeTemplateExportDone")))
          }
        >
          {t("opsSharedFeeTemplateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-tenant-shared-fee-export"
          onClick={() =>
            void downloadTenantSharedFeeTemplatesCsv(locale, "tenant-demo").then(
              () => setMessage(t("opsTenantSharedFeeTemplatesExportDone"))
            )
          }
        >
          {t("opsTenantSharedFeeTemplatesExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-sku-catalog-export"
          onClick={() =>
            void downloadSkuCatalogCsv(locale, DEMO_SKU).then(() =>
              setMessage(t("opsSkuCatalogExportDone"))
            )
          }
        >
          {t("opsSkuCatalogExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-listing-export"
          onClick={() =>
            void downloadListingCsv(locale, DEMO_LISTINGS[0]).then(() =>
              setMessage(t("opsListingExportDone"))
            )
          }
        >
          {t("opsListingExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-cost-sheet-row-export"
          onClick={() =>
            void downloadLatestCostSheetCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("opsCostSheetRowExportDone")))
              .catch(() => setMessage(t("opsCostSheetRowExportEmpty")))
          }
        >
          {t("opsCostSheetRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-competitor-offer-export"
          onClick={() =>
            void downloadFirstCompetitorOfferCsv(locale, DEMO_LISTINGS[0])
              .then(() => setMessage(t("opsCompetitorOfferExportDone")))
              .catch(() => setMessage(t("opsCompetitorOfferExportEmpty")))
          }
        >
          {t("opsCompetitorOfferExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-digest-dispatch-export"
          onClick={() =>
            void downloadLatestDigestDispatchCsv(locale)
              .then(() => setMessage(t("opsDigestDispatchExportDone")))
              .catch(() => setMessage(t("opsDigestDispatchExportEmpty")))
          }
        >
          {t("opsDigestDispatchExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-sandbox-event-export"
          onClick={() =>
            void downloadFirstChannelSandboxEventCsv(locale)
              .then(() => setMessage(t("opsSandboxEventExportDone")))
              .catch(() => setMessage(t("opsSandboxEventExportEmpty")))
          }
        >
          {t("opsSandboxEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-digest-dead-letter-job-export"
          onClick={() =>
            void downloadFirstDigestDeadLetterJobCsv(locale)
              .then(() => setMessage(t("opsDigestDeadLetterJobExportDone")))
              .catch(() => setMessage(t("opsDigestDeadLetterJobExportEmpty")))
          }
        >
          {t("opsDigestDeadLetterJobExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-tool-audit-row-export"
          onClick={() =>
            void downloadFirstAgentToolAuditRowCsv(locale)
              .then(() => setMessage(t("opsAgentToolAuditRowExportDone")))
              .catch(() => setMessage(t("opsAgentToolAuditRowExportEmpty")))
          }
        >
          {t("opsAgentToolAuditRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-price-observation-export"
          onClick={() =>
            void downloadFirstPriceObservationCsv(locale, DEMO_LISTINGS[0])
              .then(() => setMessage(t("opsPriceObservationExportDone")))
              .catch(() => setMessage(t("opsPriceObservationExportEmpty")))
          }
        >
          {t("opsPriceObservationExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-repricing-event-export"
          onClick={() =>
            void downloadLatestRepricingEventCsv(locale, DEMO_LISTINGS[0])
              .then(() => setMessage(t("opsRepricingEventExportDone")))
              .catch(() => setMessage(t("opsRepricingEventExportEmpty")))
          }
        >
          {t("opsRepricingEventExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-adjustment-batch-index-export"
          onClick={() =>
            void downloadLatestAdjustmentBatchIndexCsv(locale)
              .then(() => setMessage(t("opsAdjustmentBatchIndexExportDone")))
              .catch(() => setMessage(t("opsAdjustmentBatchIndexExportEmpty")))
          }
        >
          {t("opsAdjustmentBatchIndexExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-digest-date-export"
          onClick={() =>
            void downloadLatestAgentDigestDateCsv(locale)
              .then(() => setMessage(t("opsAgentDigestDateExportDone")))
              .catch(() => setMessage(t("opsAgentDigestDateExportEmpty")))
          }
        >
          {t("opsAgentDigestDateExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-cross-channel-row-export"
          onClick={() =>
            void downloadCrossChannelDashboardRowCsv(locale, DEMO_SKU)
              .then(() => setMessage(t("opsCrossChannelRowExportDone")))
              .catch(() => setMessage(t("opsCrossChannelRowExportEmpty")))
          }
        >
          {t("opsCrossChannelRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-curve-point-export"
          onClick={() =>
            void downloadLatestCompetitorCurvePointCsv(locale, DEMO_LISTINGS[0])
              .then(() => setMessage(t("opsCurvePointExportDone")))
              .catch(() => setMessage(t("opsCurvePointExportEmpty")))
          }
        >
          {t("opsCurvePointExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-tool-row-export"
          onClick={() =>
            void downloadFirstAgentToolRowCsv(locale)
              .then(() => setMessage(t("opsAgentToolRowExportDone")))
              .catch(() => setMessage(t("opsAgentToolRowExportEmpty")))
          }
        >
          {t("opsAgentToolRowExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-readiness-check-export"
          onClick={() =>
            void downloadFirstAgentReadinessCheckCsv(locale)
              .then(() => setMessage(t("opsAgentReadinessCheckExportDone")))
              .catch(() => setMessage(t("opsAgentReadinessCheckExportEmpty")))
          }
        >
          {t("opsAgentReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-agent-milestone-export"
          onClick={() =>
            void downloadFirstAgentMilestoneCsv(locale)
              .then(() => setMessage(t("opsAgentMilestoneExportDone")))
              .catch(() => setMessage(t("opsAgentMilestoneExportEmpty")))
          }
        >
          {t("opsAgentMilestoneExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-product-readiness-check-export"
          onClick={() =>
            void downloadFirstProductReadinessCheckCsv(locale)
              .then(() => setMessage(t("opsProductReadinessCheckExportDone")))
              .catch(() => setMessage(t("opsProductReadinessCheckExportEmpty")))
          }
        >
          {t("opsProductReadinessCheckExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-feature-flag-export"
          onClick={() =>
            void downloadFirstFeatureFlagCsv(locale)
              .then(() => setMessage(t("opsFeatureFlagExportDone")))
              .catch(() => setMessage(t("opsFeatureFlagExportEmpty")))
          }
        >
          {t("opsFeatureFlagExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-i18n-glossary-export"
          onClick={() =>
            void downloadI18nGlossaryCsv(locale)
              .then(() => setMessage(t("opsI18nGlossaryExportDone")))
              .catch(() => setMessage(t("opsI18nGlossaryExportEmpty")))
          }
        >
          {t("opsI18nGlossaryExportCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-i18n-glossary-term-export"
          onClick={() =>
            void downloadFirstI18nGlossaryTermCsv(locale)
              .then(() => setMessage(t("opsI18nGlossaryTermExportDone")))
              .catch(() => setMessage(t("opsI18nGlossaryTermExportEmpty")))
          }
        >
          {t("opsI18nGlossaryTermExportCsv")}
        </button>
      </div>
        </ExportHub>
      </AdvancedSection>

    </div>
  );
}
