import { useCallback, useEffect, useMemo, useState } from "react";
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
  downloadAgentReadinessCsv,
  downloadProductReadinessCsv,
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
import { AdvancedSection } from "@/components/patterns/AdvancedSection";
import { ExportHub } from "@/components/patterns/ExportHub";
import { PageIntent } from "@/components/patterns/PageIntent";
import { statusBadgeVariant } from "@/components/layout/AppLayout";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
  matchDataTableFilter,
} from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [shopFilter, setShopFilter] = useState("");

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

  const filteredShops = useMemo(
    () =>
      shops.filter((shop) =>
        matchDataTableFilter(
          shopFilter,
          shop.name,
          shop.channel,
          shop.auth_status,
          shop.external_seller_id
        )
      ),
    [shops, shopFilter]
  );

  return (
    <div className="space-y-4">
      <PageIntent title={t("channelsTitle")} description={t("channelsHint")} />
      {sandboxNote && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="channel-sandbox-badge">
          {t("channelSandboxBadge")}: {sandboxNote}
        </p>
      )}
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

      <Tabs defaultValue="adapter" className="space-y-4">
        <TabsList>
          <TabsTrigger value="adapter">{t("channelAdapterTitle")}</TabsTrigger>
          <TabsTrigger value="shops">{t("shopList")}</TabsTrigger>
          {sandboxNote && (
            <TabsTrigger value="sandbox" data-testid="channels-tab-sandbox">
              {t("channelSandboxEventsTitle")}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="adapter">
      {adapterStatus && (
        <Card data-testid="channel-adapter-status">
          <CardHeader>
            <CardTitle>{t("channelAdapterTitle")}</CardTitle>
            <CardDescription>{adapterStatus.note}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("channelAdapterDriver")}</dt>
              <dd className="m-0 font-medium">
                <code data-testid="channel-adapter-driver">
                  {adapterStatus.driver}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("batchStatus")}</dt>
              <dd className="m-0 font-medium">
                <Badge
                  variant={statusBadgeVariant(
                    adapterStatus.ready ? "connected" : "disconnected"
                  )}
                  data-testid="channel-adapter-ready"
                >
                  {adapterStatus.ready
                    ? t("channelAdapterReady")
                    : t("channelAdapterNotReady")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("channelAdapterPublishHttp")}</dt>
              <dd className="m-0 font-medium">
                {adapterStatus.publish_http_url_configured
                  ? t("channelAdapterConfigured")
                  : t("channelAdapterNotConfigured")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("channelAdapterPullHttp")}</dt>
              <dd className="m-0 font-medium">
                {adapterStatus.listing_pull_http_url_configured
                  ? t("channelAdapterConfigured")
                  : t("channelAdapterNotConfigured")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("channelLivePublish")}</dt>
              <dd className="m-0 font-medium">
                <Badge
                  variant={statusBadgeVariant(
                    adapterStatus.live_publish_armed ? "connected" : "disconnected"
                  )}
                  data-testid="channel-live-publish-armed"
                >
                  {adapterStatus.live_publish_armed
                    ? t("channelLivePublishArmed")
                    : t("channelLivePublishPending")}
                </Badge>
              </dd>
            </div>
          </dl>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="channel-adapter-export"
            onClick={() =>
              void downloadChannelAdapterStatusCsv(locale).then(() =>
                setMessage(t("channelAdapterExportDone"))
              )
            }
          >
            {t("channelAdapterExportCsv")}
          </Button>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="shops">
      <Card className="ring-1 ring-border/50">
        <CardHeader>
          <CardTitle>{t("shopList")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4 px-4">
        <DataTable
          testId="shops-table"
          filter={shopFilter}
          onFilterChange={setShopFilter}
          filterPlaceholder={t("dataTableFilterPlaceholder")}
          isEmpty={filteredShops.length === 0}
          emptyMessage={
            shops.length === 0 ? t("channelSandboxNoEvents") : t("dataTableNoResults")
          }
          maxHeight={400}
        >
        <DataTableRoot>
          <DataTableHeader>
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead>{t("channel")}</DataTableHead>
              <DataTableHead>{t("shopName")}</DataTableHead>
              <DataTableHead>{t("batchStatus")}</DataTableHead>
              <DataTableHead>{t("shopSellerId")}</DataTableHead>
              <DataTableHead>{t("channelLastListingSyncCol")}</DataTableHead>
              <DataTableHead>{t("shopActions")}</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {filteredShops.map((shop) => (
              <DataTableRow key={shop.id}>
                <DataTableCell>{channelLabel(shop.channel)}</DataTableCell>
                <DataTableCell className="font-medium">{shop.name}</DataTableCell>
                <DataTableCell>
                  <StatusBadge status={shop.auth_status} />
                </DataTableCell>
                <DataTableCell className="font-mono text-xs text-muted-foreground">
                  {shop.external_seller_id ?? "—"}
                </DataTableCell>
                <DataTableCell>
                  {SHOP_LISTING_ID[shop.id] &&
                    lastSyncByListing[SHOP_LISTING_ID[shop.id]] && (
                      <span
                        className="text-xs text-muted-foreground"
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
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1.5">
                  {shop.auth_status !== "connected" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void connect(shop)}>
                      {t("connectShop")}
                    </Button>
                  ) : (
                    <>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void pull(shop)}>
                        {t("pullListing")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        data-testid="listing-sync-run"
                        onClick={() => void syncListingJob(shop)}
                      >
                        {t("listingSyncRun")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void publishActive(shop)}
                      >
                        {t("publishToChannel")}
                      </Button>
                    </>
                  )}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTableRoot>
        </DataTable>
        </CardContent>
      </Card>
        </TabsContent>

        {sandboxNote && (
        <TabsContent value="sandbox">
        <Card>
          <CardHeader>
            <CardTitle>{t("channelSandboxEventsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="channel-sandbox-export"
              onClick={() =>
                void downloadChannelSandboxEventsCsv(locale).then(() =>
                  setMessage(t("channelSandboxExportDone"))
                )
              }
            >
              {t("channelSandboxExportCsv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
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
            </Button>
          </div>
          {sandboxEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="channel-sandbox-events-empty">
              {t("channelSandboxNoEvents")}
            </p>
          ) : (
            <Table data-testid="channel-sandbox-events">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("channelSandboxEventTime")}</TableHead>
                  <TableHead>{t("channelSandboxEventType")}</TableHead>
                  <TableHead>{t("channel")}</TableHead>
                  <TableHead>{t("channelSandboxListing")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sandboxEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>{new Date(ev.created_at).toLocaleString(locale)}</TableCell>
                    <TableCell>
                      <code>{ev.event_type}</code>
                    </TableCell>
                    <TableCell>{channelLabel(ev.channel)}</TableCell>
                    <TableCell>{ev.listing_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </CardContent>
        </Card>
        </TabsContent>
        )}
      </Tabs>

      <AdvancedSection title={t("advancedSection")} description={t("exportHubHint")}>
        <ExportHub title={t("exportActions")} description={t("exportHubHint")}>
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
          data-testid="channels-agent-readiness-export"
          onClick={() =>
          void downloadAgentReadinessCsv(locale).then(() =>
          setMessage(t("channelsAgentReadinessExportDone"))
          )
          }
          >
          {t("channelsAgentReadinessExportCsv")}
          </button>
          <button
          type="button"
          data-testid="channels-competitor-anchor-ml-export"
          onClick={() =>
          void downloadCompetitorAnchorCsv(locale, "listing-ml-001").then(
          () => setMessage(t("channelsCompetitorAnchorMlExportDone"))
          )
          }
          >
          {t("channelsCompetitorAnchorMlExportCsv")}
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
          data-testid="channels-product-readiness-export"
          onClick={() =>
          void downloadProductReadinessCsv(locale).then(() =>
          setMessage(t("channelsProductReadinessExportDone"))
          )
          }
          >
          {t("channelsProductReadinessExportCsv")}
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
        </ExportHub>
      </AdvancedSection>
    </div>
  );
}
