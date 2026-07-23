import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { parseAcceptLanguage, formatMoney, type AppLocale } from "@mx-pricing/i18n-format";
import {
  checkMinMargin,
  type GuardCode,
} from "@mx-pricing/pricing-engine";
import { buildPricingContext, runSimulate } from "./pricing-service.js";
import { buildSkuPricingContextView } from "./pricing-context-view.js";
import { pricingContextToCsv } from "./pricing-context-csv.js";
import {
  type CatalogRepository,
  getCatalogRepository,
  MemoryCatalogRepository,
} from "./repositories/index.js";
import {
  type AdjustmentRepository,
  getAdjustmentRepository,
  MemoryAdjustmentRepository,
} from "./repositories/adjustment-index.js";
import {
  applyAdjustmentBatch,
  buildAdjustmentBatchInput,
  previewAdjustmentBatch,
} from "./adjustment-service.js";
import {
  completeOAuthMock,
  shopPublicView,
  startOAuth,
} from "./channel-oauth.js";
import {
  MockChannelListingAdapter,
  MockChannelPublishAdapter,
  type ListingPublishAdapter,
  type ListingPullAdapter,
} from "@mx-pricing/channel-adapters";
import {
  type ShopRepository,
  getShopRepository,
  MemoryShopRepository,
} from "./repositories/shop-index.js";
import {
  type CompetitorRepository,
  getCompetitorRepository,
  MemoryCompetitorRepository,
} from "./repositories/competitor-index.js";
import { computeEffectivePrice } from "./competitor-normalize.js";
import {
  buildCompetitorAnchorSummary,
  mapOffersWithLatestObservations,
} from "./competitor-summary.js";
import { buildObservationRawJson } from "./competitor-buy-box.js";
import { getListingIdForChannel } from "./fixtures.js";
import {
  type RepricingRepository,
  getRepricingRepository,
  MemoryRepricingRepository,
} from "./repositories/repricing-index.js";
import {
  ensureIngestSchedule,
  flushListingDebounce,
  notifyObservationChange,
  processRepricingEvent,
  runMockIngest,
  IngestFailedError,
} from "./repricing/runtime.js";
import {
  type DynamicRuleRepository,
  getDynamicRuleRepository,
  getListingHealthRepository,
  MemoryDynamicRuleRepository,
  MemoryListingHealthRepository,
} from "./repositories/dynamic-rule-index.js";
import type { ListingHealthRepository } from "./repositories/dynamic-rule-types.js";
import { evaluateListingStale } from "./repricing/stale.js";
import {
  publishListingPrice,
  publishListingPriceBatch,
  LISTING_ID_BY_SHOP,
} from "./channel-publish-service.js";
import {
  listRepricingQueue,
  promoteVersionsToPending,
  buildTenantRepricingQueue,
  buildSkuRepricingQueueRows,
} from "./repricing-queue-service.js";
import { repricingQueueToCsv } from "./repricing-queue-csv.js";
import {
  planRepricingShards,
  runRepricingBatchShard,
  runRepricingBatchAllShards,
  runRepricingBatchForTenant,
} from "./repricing-batch-shard.js";
import { repricingBatchShardPlanToCsv } from "./repricing-batch-shard-plan-csv.js";
import {
  enqueueRepricingBatchJob,
  getRepricingBatchJob,
  listRepricingBatchJobs,
  processRepricingBatchQueue,
} from "./repricing-batch-job-queue.js";
import { repricingBatchJobsToCsv } from "./repricing-batch-jobs-csv.js";
import { summarizeRepricingBatchJobs } from "./repricing-batch-jobs-summary.js";
import { repricingBatchJobsSummaryToCsv } from "./repricing-batch-jobs-summary-csv.js";
import {
  type RepricingActivityRepository,
  getRepricingActivityRepository,
  MemoryRepricingActivityRepository,
} from "./repositories/repricing-activity-index.js";
import {
  type ReconciliationAlertRepository,
  getReconciliationAlertRepository,
  MemoryReconciliationAlertRepository,
} from "./repositories/reconciliation-index.js";
import { reconcileListingChannelPrice } from "./reconciliation-service.js";
import {
  getChannelAdapterStatus,
  createChannelListingAdapter,
  createChannelPublishAdapter,
} from "./channel-adapter-factory.js";
import { channelAdapterStatusToCsv } from "./channel-adapters-status-csv.js";
import { buildOpsMetricsSnapshot } from "./ops-metrics.js";
import { opsMetricsToCsv } from "./ops-metrics-csv.js";
import { recordPricingSimulate } from "./pricing-nfr-metrics.js";
import {
  applyCategoryDefaults,
  getCategoryRuleTemplate,
  listCategoryRuleTemplates,
} from "./category-rule-template.js";
import { skuCategoryRuleTemplateToCsv } from "./sku-category-rule-template-csv.js";
import { listSharedFeeTemplates, getSharedFeeTemplate } from "./tenant-fee-template-share.js";
import { applySharedFeeTemplateToSku } from "./shared-fee-template-apply.js";
import { getCrossChannelGuardForSku } from "./cross-channel-guard.js";
import { crossChannelGuardToCsv } from "./cross-channel-guard-csv.js";
import { buildCrossChannelDashboard } from "./cross-channel-dashboard.js";
import { crossChannelDashboardToCsv } from "./cross-channel-dashboard-csv.js";
import { costSheetsToCsv } from "./cost-sheets-csv.js";
import {
  applyLandedCostImport,
  parseLandedCostCsv,
} from "./landed-cost-import.js";
import { buildVersionBackupSnapshot } from "./version-backup-service.js";
import { versionBackupToCsv } from "./version-backup-csv.js";
import { priceVersionToCsv } from "./price-version-csv.js";
import { evaluateP5Readiness } from "./p5-readiness.js";
import { p5ReadinessToCsv } from "./p5-readiness-csv.js";
import { evaluateP3Readiness } from "./p3-readiness.js";
import { p3ReadinessToCsv } from "./p3-readiness-csv.js";
import { evaluateAgentReadiness } from "./agent-readiness.js";
import { p4ReadinessToCsv } from "./p4-readiness-csv.js";
import { validateVersionBackupSnapshot } from "./version-backup-validate.js";
import {
  createStoredExport,
  getStoredExport,
} from "./export-file-store.js";
import { getFxRate, listFxRates, upsertFxRate } from "./fx-rate-table.js";
import { fxRatesToCsv } from "./fx-rates-csv.js";
import { agentToolAuditToCsv } from "./agent-audit-csv.js";
import { runDueDigestDispatch } from "./digest-run-due.js";
import { computeLandedFromFx } from "./landed-cost-fx.js";
import { computeLandedFromHs } from "./landed-cost-hs.js";
import {
  getTariffHsRate,
  listTariffHsRates,
  upsertTariffHsRate,
} from "./tariff-hs-table.js";
import {
  ADJUSTMENT_IMPORT_TEMPLATE_CSV,
  parseAdjustmentPriceCsv,
} from "./adjustment-price-import.js";
import {
  createCostSheet,
  getCostSheet,
  listCostSheets,
} from "./cost-sheet-store.js";
import { computeLandedFromCostSheet } from "./landed-cost-from-sheet.js";
import {
  applyCostSheetImport,
  COST_SHEET_IMPORT_TEMPLATE_CSV,
  parseCostSheetCsv,
} from "./cost-sheet-import.js";
import {
  listListingSyncJobs,
  listListingSyncJobsForTenant,
  runListingChannelSync,
} from "./listing-sync-service.js";
import { getListingSyncJob } from "./listing-sync-journal.js";
import {
  getListingSyncSchedule,
  upsertListingSyncSchedule,
} from "./listing-sync-schedule.js";
import { listingSyncScheduleToCsv } from "./listing-sync-schedule-csv.js";
import { runDueListingChannelSyncs } from "./listing-sync-run-due.js";
import { buildCompetitorCurve } from "./competitor-curve.js";
import { competitorCurvePointsToCsv } from "./competitor-curve-csv.js";
import { adjustmentBatchToCsv } from "./adjustment-batch-csv.js";
import { adjustmentBatchesIndexToCsv } from "./adjustment-batches-index-csv.js";
import { priceHistoryToCsv } from "./price-history-csv.js";
import { repricingEventsToCsv } from "./repricing-events-csv.js";
import { categoryRuleTemplatesToCsv } from "./category-rule-templates-csv.js";
import { competitorOffersToCsv } from "./competitor-offers-csv.js";
import { competitorAnchorToCsv } from "./competitor-anchor-csv.js";
import { agentToolsToCsv } from "./agent-tools-csv.js";
import { agentReadinessToCsv } from "./agent-readiness-csv.js";
import { listingSyncOpsStatusToCsv } from "./listing-sync-ops-status-csv.js";
import { sharedFeeTemplatesToCsv } from "./shared-fee-templates-csv.js";
import { shopsToCsv } from "./shops-csv.js";
import { listingsToCsv } from "./listing-csv.js";
import { skusCatalogToCsv } from "./skus-catalog-csv.js";
import { buildListingSyncOpsStatus } from "./listing-sync-ops-status.js";
import { listingSyncJobsToCsv } from "./listing-sync-jobs-csv.js";
import { buildListingIngestStatus } from "./listing-ingest-status.js";
import { listingIngestStatusToCsv } from "./listing-ingest-status-csv.js";
import { buildWaterfallExportCsv } from "./waterfall-export.js";
import { getAdjustmentApprovalPolicy } from "./adjustment-approval-policy.js";
import { adjustmentApprovalPolicyToCsv } from "./adjustment-approval-policy-csv.js";
import {
  getAsyncWorkerStatus,
  getWorkerHeartbeat,
  recordWorkerHeartbeat,
} from "./worker-heartbeat.js";
import { opsWorkersStatusSummaryToCsv } from "./ops-workers-status-summary-csv.js";
import {
  buildPricingSnapshotRows,
  buildTenantPricingSnapshotRows,
  pricingSnapshotToCsv,
} from "./pricing-report-service.js";
import { channelSandboxEventsToCsv } from "./channel-sandbox-csv.js";
import {
  digestDeadLetterJobsToCsv,
  buildDigestDeadLetterSummary,
} from "./digest-dead-letter-csv.js";
import { digestDeadLetterSummaryToCsv } from "./digest-dead-letter-summary-csv.js";
import {
  digestQueuedJobsToCsv,
  buildDigestQueuedJobsSummary,
} from "./digest-queued-jobs-csv.js";
import { digestQueuedJobsSummaryToCsv } from "./digest-queued-jobs-summary-csv.js";
import { digestDispatchesToCsv } from "./digest-dispatches-csv.js";
import { workerHeartbeatsToCsv } from "./worker-heartbeats-csv.js";
import {
  getChannelSandboxStatus,
  isChannelSandboxEnabled,
  getChannelSandboxEvent,
  listChannelSandboxEvents,
  recordChannelSandboxEvent,
} from "./channel-sandbox-ledger.js";
import { channelSandboxStatusToCsv } from "./channel-sandbox-status-csv.js";
import {
  invokeAgentTool,
  getAgentTool,
  listAgentTools,
} from "./agent-tools.js";
import {
  compileRuleViaAdapter,
  getRuleCompilerStatus,
} from "./rule-compiler-adapter.js";
import { ruleCompilerStatusToCsv } from "./rule-compiler-status-csv.js";
import {
  storeCompiledDraft,
  takeCompiledDraft,
  type DynamicRuleDraft,
} from "./rule-compiler.js";
import {
  appendCopilotUserTurn,
  appendCopilotAssistantMessage,
  createCopilotSession,
  getCopilotSession,
} from "./copilot-session.js";
import { copilotSessionToCsv } from "./copilot-session-csv.js";
import {
  buildPricingContextNarrative,
  copilotWelcomeMessage,
} from "./copilot-narrative.js";
import { buildDailyAgentDigest } from "./agent-digest-service.js";
import { agentDigestToCsv } from "./agent-digest-csv.js";
import { tariffHsRatesToCsv } from "./tariff-hs-csv.js";
import { batchPatchSkuPolicies } from "./sku-policy-batch.js";
import {
  dispatchDailyDigest,
  getDigestDispatch,
  getDigestSchedule,
  listDigestDispatches,
  resetDigestDispatchForTests,
  upsertDigestSchedule,
} from "./agent-digest-dispatch.js";
import { digestScheduleToCsv } from "./digest-schedule-csv.js";
import { buildListingDynamicRepricingRuleView } from "./dynamic-repricing-rule-view.js";
import { dynamicRepricingRuleToCsv } from "./dynamic-repricing-rule-csv.js";
import {
  enqueueDailyDigestJob,
  getDigestQueuedJob,
  listDigestQueuedJobs,
  listDigestDeadLetterJobs,
  digestQueueSummary,
  processDigestQueue,
  resetDigestJobQueueForTests,
} from "./digest-job-queue.js";
import {
  getProductMilestoneStatus,
  getProductReadinessSummary,
} from "./agent-milestones.js";
import { agentMilestonesToCsv } from "./agent-milestones-csv.js";
import { productReadinessToCsv } from "./product-readiness-csv.js";
import {
  type AgentToolAuditRepository,
  getAgentToolAuditRepository,
  MemoryAgentToolAuditRepository,
} from "./repositories/agent-audit-index.js";
import { getAuthStatus, validateBearerTokenAsync } from "./auth.js";
import { authStatusToCsv } from "./auth-status-csv.js";
import { getFeatureFlags } from "./feature-flags.js";
import { featureFlagsToCsv } from "./feature-flags-csv.js";
import { reconciliationAlertsToCsv } from "./reconciliation-report-service.js";

export type AppEnv = {
  Variables: {
    tenantId: string;
    locale: AppLocale;
    authSubject: string;
  };
};

export interface CreateAppOptions {
  catalog?: CatalogRepository;
  adjustments?: AdjustmentRepository;
  shops?: ShopRepository;
  competitors?: CompetitorRepository;
  repricing?: RepricingRepository;
  dynamicRules?: DynamicRuleRepository;
  listingHealth?: ListingHealthRepository;
  repricingActivity?: RepricingActivityRepository;
  publishAdapter?: ListingPublishAdapter;
  listingAdapter?: ListingPullAdapter;
  reconciliationAlerts?: ReconciliationAlertRepository;
  agentAudit?: AgentToolAuditRepository;
}

export function createApp(options: CreateAppOptions = {}) {
  const catalog = options.catalog ?? getCatalogRepository();
  const adjustments = options.adjustments ?? getAdjustmentRepository();
  const shops = options.shops ?? getShopRepository();
  const competitors = options.competitors ?? getCompetitorRepository();
  const repricing = options.repricing ?? getRepricingRepository();
  const dynamicRules = options.dynamicRules ?? getDynamicRuleRepository();
  const listingHealth =
    options.listingHealth ?? getListingHealthRepository();
  const repricingActivity =
    options.repricingActivity ?? getRepricingActivityRepository();
  const reconciliationAlerts =
    options.reconciliationAlerts ?? getReconciliationAlertRepository();
  const agentAudit = options.agentAudit ?? getAgentToolAuditRepository();
  const listingAdapter =
    options.listingAdapter ?? createChannelListingAdapter();
  const publishAdapter =
    options.publishAdapter ?? createChannelPublishAdapter();
  const app = new Hono<AppEnv>();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      allowHeaders: ["Authorization", "Content-Type", "X-Tenant-Id", "Accept-Language"],
    })
  );

  app.use("*", async (c, next) => {
    if (c.req.method === "OPTIONS" || c.req.path === "/health") {
      await next();
      return;
    }
    const auth = c.req.header("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "UNAUTHORIZED" });
    }
    const token = auth.slice("Bearer ".length);
    const result = await validateBearerTokenAsync(token);
    if (!result.ok) {
      throw new HTTPException(401, { message: result.code });
    }
    const tenantId = c.req.header("X-Tenant-Id") ?? "tenant-demo";
    c.set("tenantId", tenantId);
    c.set("authSubject", result.subject);
    c.set("locale", parseAcceptLanguage(c.req.header("Accept-Language")));
    await next();
  });

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "mx-pricing-bff",
      catalog: catalog.driver,
    })
  );

  app.get("/api/v1/auth/status", (c) => c.json(getAuthStatus()));

  app.get("/api/v1/auth/status/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = authStatusToCsv(getAuthStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auth-status.csv"`,
      },
    });
  });

  app.get("/api/v1/feature-flags", (c) => c.json(getFeatureFlags()));

  app.get("/api/v1/feature-flags/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = featureFlagsToCsv(getFeatureFlags(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feature-flags.csv"`,
      },
    });
  });

  app.get("/api/v1/skus/:skuId/pricing-context/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const channel = c.req.query("channel") as
      | "MERCADO_LIBRE"
      | "AMAZON_MX"
      | undefined;
    const view = await buildSkuPricingContextView(
      { catalog, competitors },
      tenantId,
      skuId,
      c.get("locale"),
      channel
    );
    if (!view) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = pricingContextToCsv(view, exportedAt);
    const ch = view.channel.toLowerCase().replace("_", "-");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-context-${skuId}-${ch}.csv"`,
      },
    });
  });

  app.get("/api/v1/skus/:skuId/pricing-context", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const channel = c.req.query("channel") as
      | "MERCADO_LIBRE"
      | "AMAZON_MX"
      | undefined;
    const view = await buildSkuPricingContextView(
      { catalog, competitors },
      tenantId,
      skuId,
      c.get("locale"),
      channel
    );
    if (!view) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    return c.json(view.context);
  });

  app.get("/api/v1/skus/:skuId/cross-channel-guard", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const guard = await getCrossChannelGuardForSku(catalog, sku.id);
    return c.json(guard);
  });

  app.get("/api/v1/skus/:skuId/cross-channel-guard/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const guard = await getCrossChannelGuardForSku(catalog, sku.id);
    const csv = crossChannelGuardToCsv(skuId, guard, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cross-channel-guard-${skuId}.csv"`,
      },
    });
  });

  app.get("/api/v1/cross-channel/dashboard", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(await buildCrossChannelDashboard(catalog, tenantId));
  });

  app.get("/api/v1/cross-channel/dashboard/export", async (c) => {
    const tenantId = c.get("tenantId");
    const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
    const csv = crossChannelDashboardToCsv(snapshot);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cross-channel-dashboard.csv"`,
      },
    });
  });

  app.get("/api/v1/cross-channel/dashboard/:skuId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
    const item = snapshot.items.find((i) => i.sku_id === skuId);
    if (!item) {
      throw new HTTPException(404, {
        message: "CROSS_CHANNEL_DASHBOARD_ROW_NOT_FOUND",
      });
    }
    const csv = crossChannelDashboardToCsv({
      ...snapshot,
      sku_count: 1,
      alert_count: item.warning ? 1 : 0,
      items: [item],
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cross-channel-dashboard-${skuId}.csv"`,
      },
    });
  });

  app.post("/api/v1/imports/landed-cost", async (c) => {
    const tenantId = c.get("tenantId");
    const contentType = c.req.header("content-type") ?? "";
    let csvText: string;
    if (contentType.includes("application/json")) {
      const body = (await c.req.json()) as { csv?: string };
      if (!body.csv?.trim()) {
        throw new HTTPException(400, { message: "CSV_REQUIRED" });
      }
      csvText = body.csv;
    } else {
      csvText = await c.req.text();
    }
    const parsed = parseLandedCostCsv(csvText);
    if (parsed.rows.length === 0) {
      throw new HTTPException(400, { message: "IMPORT_PARSE_FAILED" });
    }
    const result = await applyLandedCostImport(
      catalog,
      tenantId,
      parsed.rows
    );
    return c.json({ parse_errors: parsed.errors, ...result });
  });

  app.get("/api/v1/imports/cost-sheets/template", async () => {
    return new Response(COST_SHEET_IMPORT_TEMPLATE_CSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cost-sheets-template.csv"',
      },
    });
  });

  app.post("/api/v1/imports/cost-sheets", async (c) => {
    const tenantId = c.get("tenantId");
    const contentType = c.req.header("content-type") ?? "";
    let csvText: string;
    if (contentType.includes("application/json")) {
      const body = (await c.req.json()) as { csv?: string };
      if (!body.csv?.trim()) {
        throw new HTTPException(400, { message: "CSV_REQUIRED" });
      }
      csvText = body.csv;
    } else {
      csvText = await c.req.text();
    }
    const parsed = parseCostSheetCsv(csvText);
    if (parsed.rows.length === 0) {
      throw new HTTPException(400, { message: "IMPORT_PARSE_FAILED" });
    }
    const result = await applyCostSheetImport(catalog, tenantId, parsed.rows);
    return c.json({ parse_errors: parsed.errors, ...result });
  });

  app.post("/api/v1/listings/:listingId/price-versions", async (c) => {
    const tenantId = c.get("tenantId");
    const listing = await catalog.getListing(tenantId, c.req.param("listingId"));
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      explicit_price_mxn: number;
      reason?: string;
    };
    const sku = listing.sku;
    const fee =
      listing.channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
    const guards: GuardCode[] = [];
    const g = checkMinMargin({
      landed_cost_mxn: sku.landed_cost_mxn,
      publish_price_mxn: body.explicit_price_mxn,
      min_margin_pct: sku.policy.min_margin_pct,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate,
    });
    if (g) {
      guards.push(g);
      return c.json(
        { error: "GUARD_REJECTED", guards, version_id: null },
        422
      );
    }
    const version = await catalog.createVersion({
      tenant_id: tenantId,
      sku_id: sku.id,
      channel: listing.channel,
      state: "active",
      publish_price_mxn: body.explicit_price_mxn,
      reason: body.reason,
    });
    return c.json({
      version_id: version.id,
      state: version.state,
      publish_price_mxn: version.publish_price_mxn,
      reason: body.reason ?? null,
    });
  });

  app.get("/api/v1/price-versions/:versionId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const versionId = c.req.param("versionId");
    const version = await catalog.getVersion(tenantId, versionId);
    if (!version) {
      throw new HTTPException(404, { message: "VERSION_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = priceVersionToCsv(version, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-version-${versionId}.csv"`,
      },
    });
  });

  app.get("/api/v1/price-versions/:versionId", async (c) => {
    const tenantId = c.get("tenantId");
    const versionId = c.req.param("versionId");
    const version = await catalog.getVersion(tenantId, versionId);
    if (!version) {
      throw new HTTPException(404, { message: "VERSION_NOT_FOUND" });
    }
    return c.json({ version });
  });

  app.get("/api/v1/skus", async (c) => {
    const tenantId = c.get("tenantId");
    const skus = await catalog.listSkus(tenantId);
    const locale = c.get("locale");
    return c.json({
      items: skus.map((s) => ({
        id: s.id,
        sku_code: s.sku_code,
        name: s.name,
        landed_cost_mxn: s.landed_cost_mxn,
        landed_cost: formatMoney({
          locale,
          currency: "MXN",
          amount: s.landed_cost_mxn,
        }),
      })),
    });
  });

  app.get("/api/v1/skus/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const skus = await catalog.listSkus(tenantId);
    const csv = skusCatalogToCsv(
      skus.map((s) => ({
        id: s.id,
        sku_code: s.sku_code,
        name: s.name,
        landed_cost_mxn: s.landed_cost_mxn,
      })),
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="skus-catalog.csv"`,
      },
    });
  });

  app.get("/api/v1/skus/:skuId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = skusCatalogToCsv(
      [
        {
          id: sku.id,
          sku_code: sku.sku_code,
          name: sku.name,
          landed_cost_mxn: sku.landed_cost_mxn,
        },
      ],
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sku-${skuId}.csv"`,
      },
    });
  });

  app.patch("/api/v1/skus/:skuId", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as { landed_cost_mxn?: number };
    if (body.landed_cost_mxn === undefined || body.landed_cost_mxn < 0) {
      throw new HTTPException(400, { message: "INVALID_LANDED_COST" });
    }
    const updated = await catalog.updateSkuLandedCost(
      tenantId,
      c.req.param("skuId"),
      body.landed_cost_mxn
    );
    if (!updated) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const locale = c.get("locale");
    return c.json({
      id: updated.id,
      sku_code: updated.sku_code,
      name: updated.name,
      landed_cost_mxn: updated.landed_cost_mxn,
      landed_cost: formatMoney({
        locale,
        currency: "MXN",
        amount: updated.landed_cost_mxn,
      }),
    });
  });

  app.patch("/api/v1/skus/:skuId/policy", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = (await c.req.json()) as {
      target_margin_pct?: number;
      min_margin_pct?: number;
      pricing_mode?: "cost" | "competitive" | "competitive_with_floor";
    };
    if (
      body.target_margin_pct !== undefined &&
      (body.target_margin_pct < 0 || body.target_margin_pct > 100)
    ) {
      throw new HTTPException(400, { message: "INVALID_TARGET_MARGIN" });
    }
    if (
      body.min_margin_pct !== undefined &&
      (body.min_margin_pct < 0 || body.min_margin_pct > 100)
    ) {
      throw new HTTPException(400, { message: "INVALID_MIN_MARGIN" });
    }
    const updated = await catalog.updateSkuPolicy(tenantId, skuId, body);
    if (!updated) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    return c.json({ id: updated.id, policy: updated.policy });
  });

  app.post("/api/v1/skus/policy/batch", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      items?: Array<{
        sku_id: string;
        target_margin_pct?: number;
        min_margin_pct?: number;
        pricing_mode?: "cost" | "competitive" | "competitive_with_floor";
      }>;
    };
    if (!body.items?.length) {
      throw new HTTPException(400, { message: "ITEMS_REQUIRED" });
    }
    const result = await batchPatchSkuPolicies(
      catalog,
      tenantId,
      body.items
    );
    return c.json(result);
  });

  app.get("/api/v1/skus/:skuId/cost-sheets", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    return c.json({ items: listCostSheets(tenantId, skuId) });
  });

  app.get("/api/v1/skus/:skuId/cost-sheets/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = costSheetsToCsv(listCostSheets(tenantId, skuId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cost-sheets-${skuId}.csv"`,
      },
    });
  });

  app.get("/api/v1/skus/:skuId/cost-sheets/:sheetId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sheetId = c.req.param("sheetId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const sheet = getCostSheet(tenantId, skuId, sheetId);
    if (!sheet) {
      throw new HTTPException(404, { message: "COST_SHEET_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = costSheetsToCsv([sheet], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cost-sheet-${sheetId}.csv"`,
      },
    });
  });

  app.post("/api/v1/skus/:skuId/cost-sheets", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      batch_no?: string;
      cogs_amount?: number;
      cogs_currency?: string;
      freight_alloc_mxn?: number;
      freight_alloc_rule?: "PER_UNIT" | "WEIGHT_BASED";
      effective_from?: string;
      source?: string;
    };
    try {
      const sheet = createCostSheet(tenantId, skuId, {
        batch_no: body.batch_no ?? "",
        cogs_amount: body.cogs_amount ?? 0,
        cogs_currency: body.cogs_currency,
        freight_alloc_mxn: body.freight_alloc_mxn,
        freight_alloc_rule: body.freight_alloc_rule,
        effective_from: body.effective_from,
        source: body.source,
      });
      return c.json(sheet, 201);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("BATCH_NO_REQUIRED") || msg.includes("COGS_AMOUNT_INVALID")) {
        throw new HTTPException(400, { message: msg.split(":")[0] });
      }
      throw e;
    }
  });

  app.get("/api/v1/skus/:skuId/waterfall/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const channel = (c.req.query("channel") ?? "MERCADO_LIBRE") as
      | "MERCADO_LIBRE"
      | "AMAZON_MX";
    const pricing_mode = c.req.query("pricing_mode") ?? "cost";
    const target_margin_pct = c.req.query("target_margin_pct")
      ? Number(c.req.query("target_margin_pct"))
      : undefined;
    const competitor_price_mxn = c.req.query("competitor_price_mxn")
      ? Number(c.req.query("competitor_price_mxn"))
      : undefined;
    const format = (c.req.query("format") ?? "csv").toLowerCase();
    const csv = buildWaterfallExportCsv(
      sku,
      { channel, pricing_mode, target_margin_pct, competitor_price_mxn },
      c.get("locale")
    );
    if (format === "json") {
      return c.json({ csv });
    }
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waterfall-${skuId}-${channel}.csv"`,
      },
    });
  });

  app.post("/api/v1/skus/:skuId/pricing/simulate", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    const t0 = performance.now();
    const result = runSimulate(sku, body, c.get("locale"));
    recordPricingSimulate(performance.now() - t0);
    return c.json(result);
  });

  app.get("/api/v1/adjustment-batches", async (c) => {
    const items = await adjustments.listBatches(c.get("tenantId"));
    return c.json({ items });
  });

  app.get("/api/v1/adjustment-batches/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const items = await adjustments.listBatches(tenantId, 100);
    const csv = adjustmentBatchesIndexToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-batches-index.csv"`,
      },
    });
  });

  app.get("/api/v1/adjustment-batches/approval-policy", async (c) => {
    return c.json(getAdjustmentApprovalPolicy());
  });

  app.get("/api/v1/adjustment-batches/approval-policy/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = adjustmentApprovalPolicyToCsv(
      getAdjustmentApprovalPolicy(),
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-approval-policy.csv"`,
      },
    });
  });

  app.post("/api/v1/adjustment-batches/preview", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      reason_code?: string;
      items: Array<{ listing_id: string; explicit_price_mxn: number }>;
    };
    if (!body.items?.length) {
      throw new HTTPException(400, { message: "ITEMS_REQUIRED" });
    }
    try {
      const preview = await previewAdjustmentBatch(catalog, tenantId, body);
      return c.json(preview);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ error: "GUARD_REJECTED", code: msg.split(":")[1] }, 422);
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/adjustment-batches", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      reason_code?: string;
      items: Array<{ listing_id: string; explicit_price_mxn: number }>;
    };
    if (!body.items?.length) {
      throw new HTTPException(400, { message: "ITEMS_REQUIRED" });
    }
    try {
      const built = await buildAdjustmentBatchInput(catalog, tenantId, body);
      const batch = await adjustments.createBatch({
        tenant_id: tenantId,
        reason_code: built.reason_code,
        status: built.status,
        items: built.prepared.map((p) => ({
          listing_id: p.listing_id,
          explicit_price_mxn: p.explicit_price_mxn,
          from_price_mxn: p.from_price_mxn,
          guard_result: p.guard_result,
        })),
      });
      return c.json(
        { ...batch, approval_triggers: built.approval_triggers, max_drop_pct: built.maxDrop },
        201
      );
    } catch (e) {
      const msg = String(e);
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ error: "GUARD_REJECTED", code: msg.split(":")[1] }, 422);
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.get("/api/v1/adjustment-batches/:batchId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const batch = await adjustments.getBatch(tenantId, batchId);
    if (!batch) {
      throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
    }
    const csv = adjustmentBatchToCsv(batch);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-${batchId}.csv"`,
      },
    });
  });

  app.get("/api/v1/adjustment-batches/:batchId/index/export", async (c) => {
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const batch = await adjustments.getBatch(tenantId, batchId);
    if (!batch) {
      throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = adjustmentBatchesIndexToCsv([batch], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-batch-index-${batchId}.csv"`,
      },
    });
  });

  app.get("/api/v1/adjustment-batches/:batchId", async (c) => {
    const batch = await adjustments.getBatch(
      c.get("tenantId"),
      c.req.param("batchId")
    );
    if (!batch) {
      throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
    }
    return c.json(batch);
  });

  app.post("/api/v1/adjustment-batches/:batchId/approve", async (c) => {
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const batch = await adjustments.getBatch(tenantId, batchId);
    if (!batch) {
      throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
    }
    if (batch.status !== "pending_approval") {
      return c.json({ error: "INVALID_STATUS", status: batch.status }, 400);
    }
    const updated = await adjustments.updateBatchStatus(
      tenantId,
      batchId,
      "approved",
      { approved_at: new Date().toISOString() }
    );
    return c.json(updated);
  });

  app.post("/api/v1/adjustment-batches/:batchId/apply", async (c) => {
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const result = await applyAdjustmentBatch(
      catalog,
      adjustments,
      tenantId,
      batchId
    );
    if (result.error === "NOT_FOUND") {
      throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
    }
    if (result.error === "APPROVAL_REQUIRED") {
      return c.json({ error: "APPROVAL_REQUIRED" }, 422);
    }
    if (result.error) {
      return c.json({ error: result.error }, 400);
    }
    return c.json(result);
  });

  app.get("/api/v1/shops", async (c) => {
    const items = await shops.listShops(c.get("tenantId"));
    return c.json({ items: items.map(shopPublicView) });
  });

  app.get("/api/v1/shops/:shopId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException(404, { message: "SHOP_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = shopsToCsv([shopPublicView(shop)], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shop-${shopId}.csv"`,
      },
    });
  });

  app.get("/api/v1/shops/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const items = await shops.listShops(tenantId);
    const csv = shopsToCsv(items.map(shopPublicView), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shops.csv"`,
      },
    });
  });

  app.get("/api/v1/channels/sandbox/status", async (c) => {
    return c.json(getChannelSandboxStatus());
  });

  app.get("/api/v1/channels/sandbox/status/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = channelSandboxStatusToCsv(getChannelSandboxStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-sandbox-status.csv"`,
      },
    });
  });

  app.get("/api/v1/channels/adapters/status", async (c) => {
    return c.json(getChannelAdapterStatus());
  });

  app.get("/api/v1/channels/adapters/status/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = channelAdapterStatusToCsv(getChannelAdapterStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-adapters-status.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/metrics", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(await buildOpsMetricsSnapshot(catalog, tenantId));
  });

  app.get("/api/v1/ops/metrics/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const snapshot = await buildOpsMetricsSnapshot(catalog, tenantId);
    const csv = opsMetricsToCsv(snapshot, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ops-metrics.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/version-backup/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
    const csv = versionBackupToCsv(snapshot, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="version-backup-${tenantId}.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/version-backup", async (c) => {
    const tenantId = c.get("tenantId");
    const format = (c.req.query("format") ?? "json").toLowerCase();
    const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
    if (format === "download") {
      return new Response(JSON.stringify(snapshot, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="version-backup-${tenantId}.json"`,
        },
      });
    }
    return c.json(snapshot);
  });

  app.post("/api/v1/ops/version-backup/validate", async (c) => {
    const body = (await c.req.json()) as { snapshot?: unknown };
    if (body.snapshot === undefined) {
      throw new HTTPException(400, { message: "SNAPSHOT_REQUIRED" });
    }
    return c.json(validateVersionBackupSnapshot(body.snapshot));
  });

  app.get("/api/v1/fx-rates", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json({ items: listFxRates(tenantId) });
  });

  app.get("/api/v1/fx-rates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const csv = fxRatesToCsv(listFxRates(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fx-rates.csv"`,
      },
    });
  });

  app.get("/api/v1/fx-rates/:base/:quote/export", async (c) => {
    const tenantId = c.get("tenantId");
    const base = c.req.param("base").toUpperCase();
    const quote = c.req.param("quote").toUpperCase();
    const row = getFxRate(tenantId, base, quote);
    if (!row) {
      throw new HTTPException(404, { message: "FX_RATE_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = fxRatesToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fx-rate-${base}-${quote}.csv"`,
      },
    });
  });

  app.put("/api/v1/fx-rates/:base/:quote", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      rate?: number;
      buffer_pct?: number;
      effective_from?: string;
      source?: string;
    };
    if (body.rate === undefined || body.rate <= 0) {
      throw new HTTPException(400, { message: "RATE_REQUIRED" });
    }
    const items = upsertFxRate(tenantId, {
      base: c.req.param("base").toUpperCase(),
      quote: c.req.param("quote").toUpperCase(),
      rate: body.rate,
      buffer_pct: body.buffer_pct ?? 2,
      effective_from: body.effective_from ?? new Date().toISOString(),
      source: body.source ?? "tenant-config",
    });
    return c.json({ items });
  });

  app.get("/api/v1/tariff-hs-rates", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json({ items: listTariffHsRates(tenantId) });
  });

  app.get("/api/v1/tariff-hs-rates/:hsCode/export", async (c) => {
    const tenantId = c.get("tenantId");
    const hsCode = decodeURIComponent(c.req.param("hsCode"));
    const row = getTariffHsRate(tenantId, hsCode);
    if (!row) {
      throw new HTTPException(404, { message: "TARIFF_HS_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = tariffHsRatesToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tariff-hs-${hsCode.replace(/[^a-zA-Z0-9.-]+/g, "_")}.csv"`,
      },
    });
  });

  app.get("/api/v1/tariff-hs-rates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const csv = tariffHsRatesToCsv(listTariffHsRates(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tariff-hs-rates.csv"`,
      },
    });
  });

  app.put("/api/v1/tariff-hs-rates/:hsCode", async (c) => {
    const tenantId = c.get("tenantId");
    const hsCode = decodeURIComponent(c.req.param("hsCode"));
    const body = (await c.req.json()) as {
      description?: string;
      tariff_rate?: number;
      customs_fee_mxn?: number;
    };
    if (body.tariff_rate === undefined || body.tariff_rate < 0) {
      throw new HTTPException(400, { message: "TARIFF_RATE_REQUIRED" });
    }
    const existing = listTariffHsRates(tenantId).find((r) => r.hs_code === hsCode);
    const items = upsertTariffHsRate(tenantId, {
      hs_code: hsCode,
      description: body.description ?? existing?.description ?? hsCode,
      tariff_rate: body.tariff_rate,
      customs_fee_mxn: body.customs_fee_mxn ?? existing?.customs_fee_mxn ?? 0,
    });
    return c.json({ items });
  });

  app.post("/api/v1/skus/:skuId/landed-cost/from-hs", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      cogs_amount: number;
      cogs_currency?: string;
      freight_alloc_mxn?: number;
      hs_code?: string;
      apply?: boolean;
    };
    const hsCode = body.hs_code ?? sku.hs_code;
    if (!hsCode) {
      throw new HTTPException(400, { message: "HS_CODE_REQUIRED" });
    }
    try {
      const { tariff, computed } = computeLandedFromHs(tenantId, hsCode, {
        cogs_amount: body.cogs_amount,
        cogs_currency: body.cogs_currency,
        freight_alloc_mxn: body.freight_alloc_mxn,
      });
      let sku_record = sku;
      if (body.apply === true) {
        const updated = await catalog.updateSkuLandedCost(
          tenantId,
          skuId,
          computed.landed_cost_mxn
        );
        if (updated) sku_record = updated;
      }
      return c.json({
        hs_code: hsCode,
        tariff,
        computed,
        sku: { id: sku_record.id, landed_cost_mxn: sku_record.landed_cost_mxn },
      });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("HS_CODE_NOT_FOUND")) {
        throw new HTTPException(404, { message: "HS_CODE_NOT_FOUND" });
      }
      if (msg.includes("HS_LANDED_MXN_ONLY")) {
        throw new HTTPException(400, { message: "HS_LANDED_MXN_ONLY" });
      }
      throw e;
    }
  });

  app.get("/api/v1/imports/adjustment-prices/template", async (c) => {
    return new Response(ADJUSTMENT_IMPORT_TEMPLATE_CSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="adjustment-prices-template.csv"',
      },
    });
  });

  app.post("/api/v1/imports/adjustment-prices", async (c) => {
    const tenantId = c.get("tenantId");
    const contentType = c.req.header("content-type") ?? "";
    let csvText: string;
    let reason_code: string | undefined;
    let apply = false;
    if (contentType.includes("application/json")) {
      const body = (await c.req.json()) as {
        csv?: string;
        reason_code?: string;
        apply?: boolean;
      };
      if (!body.csv?.trim()) {
        throw new HTTPException(400, { message: "CSV_REQUIRED" });
      }
      csvText = body.csv;
      reason_code = body.reason_code;
      apply = body.apply === true;
    } else {
      csvText = await c.req.text();
    }
    const parsed = parseAdjustmentPriceCsv(csvText);
    if (parsed.rows.length === 0) {
      return c.json({ parse_errors: parsed.errors, preview: null }, 400);
    }
    try {
      const preview = await previewAdjustmentBatch(catalog, tenantId, {
        reason_code,
        items: parsed.rows,
      });
      if (!apply) {
        return c.json({ parse_errors: parsed.errors, preview });
      }
      const built = await buildAdjustmentBatchInput(catalog, tenantId, {
        reason_code,
        items: parsed.rows,
      });
      const batch = await adjustments.createBatch({
        tenant_id: tenantId,
        reason_code: built.reason_code,
        status: built.status,
        items: built.prepared.map((p) => ({
          listing_id: p.listing_id,
          explicit_price_mxn: p.explicit_price_mxn,
          from_price_mxn: p.from_price_mxn,
          guard_result: p.guard_result,
        })),
      });
      return c.json(
        {
          parse_errors: parsed.errors,
          preview,
          batch: {
            ...batch,
            approval_triggers: built.approval_triggers,
            max_drop_pct: built.maxDrop,
          },
        },
        201
      );
    } catch (e) {
      const msg = String(e);
      if (msg.includes("GUARD_REJECTED")) {
        return c.json(
          { parse_errors: parsed.errors, error: "GUARD_REJECTED", code: msg.split(":")[1] },
          422
        );
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/skus/:skuId/landed-cost/from-cost-sheet", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      cost_sheet_id: string;
      hs_code?: string;
      apply?: boolean;
    };
    if (!body.cost_sheet_id?.trim()) {
      throw new HTTPException(400, { message: "COST_SHEET_ID_REQUIRED" });
    }
    try {
      const result = await computeLandedFromCostSheet(
        catalog,
        tenantId,
        skuId,
        body.cost_sheet_id,
        { hs_code: body.hs_code }
      );
      const landed_mxn = result.computed.landed_cost_mxn;
      let sku_record = sku;
      if (body.apply === true) {
        const updated = await catalog.updateSkuLandedCost(
          tenantId,
          skuId,
          landed_mxn
        );
        if (updated) sku_record = updated;
      }
      return c.json({
        ...result,
        sku: { id: sku_record.id, landed_cost_mxn: sku_record.landed_cost_mxn },
      });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("COST_SHEET_NOT_FOUND")) {
        throw new HTTPException(404, { message: "COST_SHEET_NOT_FOUND" });
      }
      if (msg.includes("HS_CODE_NOT_FOUND") || msg.includes("HS_CODE_REQUIRED")) {
        throw new HTTPException(400, { message: msg.split(":")[0] });
      }
      if (msg.includes("FX_RATE_NOT_FOUND")) {
        throw new HTTPException(404, { message: "FX_RATE_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/skus/:skuId/landed-cost/from-fx", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      cogs_amount: number;
      cogs_currency?: string;
      freight_alloc_mxn?: number;
      tariff_rate?: number;
      customs_fee_mxn?: number;
      apply?: boolean;
    };
    try {
      const computed = computeLandedFromFx(tenantId, {
        cogs_amount: body.cogs_amount,
        cogs_currency: body.cogs_currency ?? "USD",
        freight_alloc_mxn: body.freight_alloc_mxn,
        tariff_rate: body.tariff_rate,
        customs_fee_mxn: body.customs_fee_mxn,
      });
      let sku_record = sku;
      if (body.apply === true) {
        const updated = await catalog.updateSkuLandedCost(
          tenantId,
          skuId,
          computed.landed_cost_mxn
        );
        if (updated) sku_record = updated;
      }
      return c.json({ computed, sku: { id: sku_record.id, landed_cost_mxn: sku_record.landed_cost_mxn } });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("FX_RATE_NOT_FOUND")) {
        throw new HTTPException(404, { message: "FX_RATE_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/exports", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      kind?: string;
      sku_id?: string;
      channel?: "MERCADO_LIBRE" | "AMAZON_MX";
      pricing_mode?: string;
      target_margin_pct?: number;
      competitor_price_mxn?: number;
      listing_id?: string;
      range?: string;
      batch_id?: string;
      limit?: number;
      sample?: number;
      date?: string;
      shard_total?: number;
      job_id?: string;
      category_id?: string;
      session_id?: string;
      version_id?: string;
      shop_id?: string;
      fee_template_id?: string;
      hs_code?: string;
      fx_base?: string;
      fx_quote?: string;
      cost_sheet_id?: string;
      offer_id?: string;
      alert_id?: string;
      sync_job_id?: string;
      digest_job_id?: string;
      dispatch_job_id?: string;
      sandbox_event_id?: string;
      audit_id?: string;
      worker_id?: string;
      observation_id?: string;
      repricing_event_id?: string;
      curve_date?: string;
      tool_name?: string;
    };
    const kind = body.kind ?? "version_backup";
    let content = "";
    let content_type = "application/json";
    if (kind === "version_backup") {
      const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
      content = JSON.stringify(snapshot, null, 2);
    } else if (kind === "pricing_snapshot_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const rows = await buildPricingSnapshotRows(catalog, tenantId, skuId);
      content = pricingSnapshotToCsv(rows, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "waterfall_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      content = buildWaterfallExportCsv(
        sku,
        {
          channel: body.channel ?? "MERCADO_LIBRE",
          pricing_mode: body.pricing_mode ?? "cost",
          target_margin_pct: body.target_margin_pct,
          competitor_price_mxn: body.competitor_price_mxn,
        },
        c.get("locale")
      );
      content_type = "text/csv";
    } else if (kind === "competitor_curve_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const range = body.range ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const observations = await competitors.listObservations(listingId, since);
      const points = buildCompetitorCurve(
        observations.map((o) => ({
          observed_at: o.observed_at,
          effective_price: o.effective_price,
        }))
      );
      content = competitorCurvePointsToCsv(points);
      content_type = "text/csv";
    } else if (kind === "adjustment_batch_csv") {
      const batchId = body.batch_id?.trim();
      if (!batchId) {
        throw new HTTPException(400, { message: "BATCH_ID_REQUIRED" });
      }
      const batch = await adjustments.getBatch(tenantId, batchId);
      if (!batch) {
        throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
      }
      content = adjustmentBatchToCsv(batch);
      content_type = "text/csv";
    } else if (kind === "listing_sync_jobs_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = listListingSyncJobsForTenant(tenantId, limit);
      content = listingSyncJobsToCsv(jobs, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "reconciliation_alerts_csv") {
      const items = await reconciliationAlerts.listAlerts(tenantId);
      content = reconciliationAlertsToCsv(items, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "cross_channel_dashboard_csv") {
      const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
      content = crossChannelDashboardToCsv(snapshot);
      content_type = "text/csv";
    } else if (kind === "cost_sheets_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      content = costSheetsToCsv(
        listCostSheets(tenantId, skuId),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "repricing_batch_jobs_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = await listRepricingBatchJobs(tenantId, limit);
      content = repricingBatchJobsToCsv(jobs, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_digest_csv") {
      const digest = await buildDailyAgentDigest(
        { catalog, reconciliationAlerts, agentAudit },
        tenantId,
        c.get("locale"),
        body.date
      );
      content = agentDigestToCsv(digest);
      content_type = "text/csv";
    } else if (kind === "tariff_hs_csv") {
      content = tariffHsRatesToCsv(
        listTariffHsRates(tenantId),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "fx_rates_csv") {
      content = fxRatesToCsv(
        listFxRates(tenantId),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "agent_tool_audit_csv") {
      const limit = Math.min(200, Math.max(1, Number(body.limit ?? 100) || 100));
      const items = await agentAudit.listInvocations(tenantId, limit);
      content = agentToolAuditToCsv(items, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "pricing_snapshots_tenant_csv") {
      const rows = await buildTenantPricingSnapshotRows(catalog, tenantId);
      content = pricingSnapshotToCsv(rows, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_sandbox_events_csv") {
      const limit = Math.min(200, Math.max(1, Number(body.limit ?? 100) || 100));
      const events = listChannelSandboxEvents(tenantId, limit);
      content = channelSandboxEventsToCsv(events, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dead_letter_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = listDigestDeadLetterJobs(tenantId, limit);
      content = digestDeadLetterJobsToCsv(jobs, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_queue_csv") {
      const rows = await buildTenantRepricingQueue(catalog, tenantId);
      content = repricingQueueToCsv(rows, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dispatches_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const items = listDigestDispatches(tenantId, limit);
      content = digestDispatchesToCsv(items, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_queued_jobs_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = listDigestQueuedJobs(tenantId, limit);
      content = digestQueuedJobsToCsv(jobs, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "worker_heartbeats_csv") {
      const status = getAsyncWorkerStatus();
      content = workerHeartbeatsToCsv(status.workers, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "price_history_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const range = body.range ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const observations = await competitors.listObservations(listingId, since);
      content = priceHistoryToCsv(
        listingId,
        observations,
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "repricing_events_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const items = await repricing.listEvents(tenantId, listingId, 200);
      content = repricingEventsToCsv(items, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "adjustment_batches_index_csv") {
      const items = await adjustments.listBatches(tenantId, 100);
      content = adjustmentBatchesIndexToCsv(items, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "skus_catalog_csv") {
      const skus = await catalog.listSkus(tenantId);
      content = skusCatalogToCsv(
        skus.map((s) => ({
          id: s.id,
          sku_code: s.sku_code,
          name: s.name,
          landed_cost_mxn: s.landed_cost_mxn,
        })),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "shops_csv") {
      const shopItems = await shops.listShops(tenantId);
      content = shopsToCsv(shopItems.map(shopPublicView), new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "category_rule_templates_csv") {
      const templates = listCategoryRuleTemplates(tenantId);
      content = categoryRuleTemplatesToCsv(templates, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "competitor_offers_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const offers = await mapOffersWithLatestObservations(
        competitors,
        listingId
      );
      content = competitorOffersToCsv(listingId, offers, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "shared_fee_templates_csv") {
      const templates = listSharedFeeTemplates(tenantId);
      content = sharedFeeTemplatesToCsv(templates, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "ops_metrics_csv") {
      const snapshot = await buildOpsMetricsSnapshot(catalog, tenantId);
      content = opsMetricsToCsv(snapshot, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_ops_status_csv") {
      const sample = Math.min(100, Math.max(1, Number(body.sample ?? 50) || 50));
      const status = buildListingSyncOpsStatus(tenantId, sample);
      content = listingSyncOpsStatusToCsv(status, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_jobs_listing_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = listListingSyncJobs(tenantId, listingId, limit);
      content = listingSyncJobsToCsv(jobs, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_tools_csv") {
      content = agentToolsToCsv(listAgentTools(), new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_jobs_summary_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const summary = await summarizeRepricingBatchJobs(tenantId, limit);
      content = repricingBatchJobsSummaryToCsv(
        summary,
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "listing_ingest_status_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const status = await buildListingIngestStatus(
        { catalog, repricing, listingHealth },
        tenantId,
        listingId
      );
      if (!status) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      content = listingIngestStatusToCsv(status, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "feature_flags_csv") {
      content = featureFlagsToCsv(getFeatureFlags(), new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_readiness_csv") {
      content = agentReadinessToCsv(
        evaluateAgentReadiness(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "competitor_anchor_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const withLatest = await mapOffersWithLatestObservations(
        competitors,
        listingId
      );
      const anchor = buildCompetitorAnchorSummary(withLatest);
      content = competitorAnchorToCsv(
        listingId,
        anchor,
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "product_readiness_csv") {
      content = productReadinessToCsv(
        getProductReadinessSummary(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "digest_queued_jobs_summary_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = listDigestQueuedJobs(tenantId, limit);
      const summary = buildDigestQueuedJobsSummary(tenantId, jobs);
      content = digestQueuedJobsSummaryToCsv(
        summary,
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "channel_adapters_status_csv") {
      content = channelAdapterStatusToCsv(
        getChannelAdapterStatus(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "rule_compiler_status_csv") {
      content = ruleCompilerStatusToCsv(
        getRuleCompilerStatus(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "auth_status_csv") {
      content = authStatusToCsv(getAuthStatus(), new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_sandbox_status_csv") {
      content = channelSandboxStatusToCsv(
        getChannelSandboxStatus(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "digest_dead_letter_summary_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs = listDigestDeadLetterJobs(tenantId, limit);
      const summary = buildDigestDeadLetterSummary(
        tenantId,
        jobs,
        digestQueueSummary(tenantId)
      );
      content = digestDeadLetterSummaryToCsv(
        summary,
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "listing_sync_schedule_csv") {
      content = listingSyncScheduleToCsv(
        getListingSyncSchedule(tenantId),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "agent_milestones_csv") {
      content = agentMilestonesToCsv(
        getProductMilestoneStatus(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "adjustment_approval_policy_csv") {
      content = adjustmentApprovalPolicyToCsv(
        getAdjustmentApprovalPolicy(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "ops_workers_status_summary_csv") {
      content = opsWorkersStatusSummaryToCsv(
        getAsyncWorkerStatus(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "cross_channel_guard_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const guard = await getCrossChannelGuardForSku(catalog, skuId);
      content = crossChannelGuardToCsv(skuId, guard, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_schedule_csv") {
      content = digestScheduleToCsv(
        getDigestSchedule(tenantId),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "dynamic_repricing_rule_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const view = await buildListingDynamicRepricingRuleView(
        { catalog, dynamicRules, listingHealth },
        tenantId,
        listingId
      );
      if (!view) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      content = dynamicRepricingRuleToCsv(view, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_queue_sku_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const rows = await buildSkuRepricingQueueRows(catalog, tenantId, skuId);
      content = repricingQueueToCsv(rows, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_shard_plan_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const shardTotal = Math.min(
        64,
        Math.max(1, Number(body.shard_total ?? 2) || 2)
      );
      const plan = planRepricingShards(tenantId, skuId, shardTotal);
      content = repricingBatchShardPlanToCsv(plan, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "sku_category_rule_template_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const categoryId = sku.category_id ?? null;
      const template = categoryId
        ? getCategoryRuleTemplate(tenantId, categoryId)
        : undefined;
      content = skuCategoryRuleTemplateToCsv(
        skuId,
        categoryId,
        template ?? null,
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "pricing_context_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const channel = body.channel ?? "MERCADO_LIBRE";
      const view = await buildSkuPricingContextView(
        { catalog, competitors },
        tenantId,
        skuId,
        c.get("locale"),
        channel
      );
      if (!view) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      content = pricingContextToCsv(view, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_job_csv") {
      const jobId = body.job_id;
      if (!jobId?.trim()) {
        throw new HTTPException(400, { message: "JOB_ID_REQUIRED" });
      }
      const job = await getRepricingBatchJob(tenantId, jobId);
      if (!job) {
        throw new HTTPException(404, { message: "JOB_NOT_FOUND" });
      }
      content = repricingBatchJobsToCsv([job], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "category_rule_template_csv") {
      const categoryId = body.category_id ?? "cat-electronics-mx";
      const tpl = getCategoryRuleTemplate(tenantId, categoryId);
      if (!tpl) {
        throw new HTTPException(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
      }
      content = categoryRuleTemplatesToCsv([tpl], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "copilot_session_csv") {
      const sessionId = body.session_id;
      if (!sessionId?.trim()) {
        throw new HTTPException(400, { message: "SESSION_ID_REQUIRED" });
      }
      const session = getCopilotSession(tenantId, sessionId);
      if (!session) {
        throw new HTTPException(404, { message: "SESSION_NOT_FOUND" });
      }
      content = copilotSessionToCsv(session, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "price_version_csv") {
      const versionId = body.version_id;
      if (!versionId?.trim()) {
        throw new HTTPException(400, { message: "VERSION_ID_REQUIRED" });
      }
      const version = await catalog.getVersion(tenantId, versionId);
      if (!version) {
        throw new HTTPException(404, { message: "VERSION_NOT_FOUND" });
      }
      content = priceVersionToCsv(version, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "version_backup_rows_csv") {
      const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
      content = versionBackupToCsv(snapshot, new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "p5_readiness_csv") {
      content = p5ReadinessToCsv(
        evaluateP5Readiness(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "shop_csv") {
      const shopId = body.shop_id ?? "shop-ml-demo";
      const shop = await shops.getShop(tenantId, shopId);
      if (!shop) {
        throw new HTTPException(404, { message: "SHOP_NOT_FOUND" });
      }
      content = shopsToCsv([shopPublicView(shop)], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "p3_readiness_csv") {
      content = p3ReadinessToCsv(
        evaluateP3Readiness(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "p4_readiness_csv") {
      content = p4ReadinessToCsv(
        evaluateAgentReadiness(),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "shared_fee_template_csv") {
      const templateId = body.fee_template_id ?? "fee-tpl-ml-electronics";
      const tpl = getSharedFeeTemplate(tenantId, templateId);
      if (!tpl) {
        throw new HTTPException(404, { message: "SHARED_FEE_TEMPLATE_NOT_FOUND" });
      }
      content = sharedFeeTemplatesToCsv([tpl], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "tenant_shared_fee_templates_csv") {
      content = sharedFeeTemplatesToCsv(
        listSharedFeeTemplates(tenantId),
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "sku_catalog_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      content = skusCatalogToCsv(
        [
          {
            id: sku.id,
            sku_code: sku.sku_code,
            name: sku.name,
            landed_cost_mxn: sku.landed_cost_mxn,
          },
        ],
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "listing_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      content = listingsToCsv(
        [
          {
            id: listing.id,
            sku_id: listing.sku_id,
            channel: listing.channel,
          },
        ],
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "tariff_hs_rate_csv") {
      const hsCode = body.hs_code ?? "HS-ELECTRONICS-MX";
      const row = getTariffHsRate(tenantId, hsCode);
      if (!row) {
        throw new HTTPException(404, { message: "TARIFF_HS_NOT_FOUND" });
      }
      content = tariffHsRatesToCsv([row], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "fx_rate_csv") {
      const base = (body.fx_base ?? "USD").toUpperCase();
      const quote = (body.fx_quote ?? "MXN").toUpperCase();
      const row = getFxRate(tenantId, base, quote);
      if (!row) {
        throw new HTTPException(404, { message: "FX_RATE_NOT_FOUND" });
      }
      content = fxRatesToCsv([row], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "cost_sheet_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sheetId = body.cost_sheet_id;
      if (!sheetId?.trim()) {
        throw new HTTPException(400, { message: "COST_SHEET_ID_REQUIRED" });
      }
      const sheet = getCostSheet(tenantId, skuId, sheetId.trim());
      if (!sheet) {
        throw new HTTPException(404, { message: "COST_SHEET_NOT_FOUND" });
      }
      content = costSheetsToCsv([sheet], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "competitor_offer_csv") {
      const offerId = body.offer_id;
      if (!offerId?.trim()) {
        throw new HTTPException(400, { message: "OFFER_ID_REQUIRED" });
      }
      const offer = await competitors.getOffer(offerId.trim());
      if (!offer) {
        throw new HTTPException(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
      }
      const listing = await catalog.getListing(tenantId, offer.listing_id);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const withLatest = await mapOffersWithLatestObservations(
        competitors,
        offer.listing_id
      );
      const row = withLatest.find((o) => o.id === offerId.trim());
      if (!row) {
        throw new HTTPException(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
      }
      content = competitorOffersToCsv(
        offer.listing_id,
        [row],
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "reconciliation_alert_csv") {
      const alertId = body.alert_id;
      if (!alertId?.trim()) {
        throw new HTTPException(400, { message: "ALERT_ID_REQUIRED" });
      }
      const items = await reconciliationAlerts.listAlerts(tenantId);
      const alert = items.find((a) => a.id === alertId.trim());
      if (!alert) {
        throw new HTTPException(404, { message: "RECONCILIATION_ALERT_NOT_FOUND" });
      }
      content = reconciliationAlertsToCsv([alert], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_job_csv") {
      const jobId = body.sync_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException(400, { message: "SYNC_JOB_ID_REQUIRED" });
      }
      const job = getListingSyncJob(tenantId, jobId.trim());
      if (!job) {
        throw new HTTPException(404, { message: "LISTING_SYNC_JOB_NOT_FOUND" });
      }
      content = listingSyncJobsToCsv([job], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_queued_job_csv") {
      const jobId = body.digest_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException(400, { message: "DIGEST_JOB_ID_REQUIRED" });
      }
      const job = getDigestQueuedJob(tenantId, jobId.trim());
      if (!job) {
        throw new HTTPException(404, { message: "DIGEST_JOB_NOT_FOUND" });
      }
      content = digestQueuedJobsToCsv([job], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "worker_heartbeat_csv") {
      const workerId = body.worker_id ?? "repricing-batch-1";
      const beat = getWorkerHeartbeat(workerId);
      if (!beat) {
        throw new HTTPException(404, { message: "WORKER_HEARTBEAT_NOT_FOUND" });
      }
      const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
      const stale =
        Date.now() - new Date(beat.reported_at).getTime() > staleSec * 1000;
      content = workerHeartbeatsToCsv(
        [{ ...beat, stale }],
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "digest_dispatch_csv") {
      const jobId = body.dispatch_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException(400, { message: "DISPATCH_JOB_ID_REQUIRED" });
      }
      const dispatch = getDigestDispatch(tenantId, jobId.trim());
      if (!dispatch) {
        throw new HTTPException(404, { message: "DIGEST_DISPATCH_NOT_FOUND" });
      }
      content = digestDispatchesToCsv([dispatch], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_sandbox_event_csv") {
      const eventId = body.sandbox_event_id;
      if (!eventId?.trim()) {
        throw new HTTPException(400, { message: "SANDBOX_EVENT_ID_REQUIRED" });
      }
      const ev = getChannelSandboxEvent(tenantId, eventId.trim());
      if (!ev) {
        throw new HTTPException(404, { message: "SANDBOX_EVENT_NOT_FOUND" });
      }
      content = channelSandboxEventsToCsv([ev], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dead_letter_job_csv") {
      const jobId = body.digest_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException(400, { message: "DIGEST_JOB_ID_REQUIRED" });
      }
      const job = getDigestQueuedJob(tenantId, jobId.trim());
      if (!job || job.status !== "dead_letter") {
        throw new HTTPException(404, {
          message: "DIGEST_DEAD_LETTER_JOB_NOT_FOUND",
        });
      }
      content = digestDeadLetterJobsToCsv([job], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_tool_audit_csv") {
      const auditId = body.audit_id;
      if (!auditId?.trim()) {
        throw new HTTPException(400, { message: "AUDIT_ID_REQUIRED" });
      }
      const items = await agentAudit.listInvocations(tenantId, 200);
      const row = items.find((a) => a.id === auditId.trim());
      if (!row) {
        throw new HTTPException(404, { message: "AGENT_TOOL_AUDIT_NOT_FOUND" });
      }
      content = agentToolAuditToCsv([row], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "price_observation_csv") {
      const observationId = body.observation_id;
      if (!observationId?.trim()) {
        throw new HTTPException(400, { message: "OBSERVATION_ID_REQUIRED" });
      }
      const obs = await competitors.getObservation(observationId.trim());
      if (!obs) {
        throw new HTTPException(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
      }
      const offer = await competitors.getOffer(obs.offer_id);
      if (!offer) {
        throw new HTTPException(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
      }
      const listing = await catalog.getListing(tenantId, offer.listing_id);
      if (!listing) {
        throw new HTTPException(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
      }
      content = priceHistoryToCsv(
        offer.listing_id,
        [obs],
        new Date().toISOString()
      );
      content_type = "text/csv";
    } else if (kind === "repricing_event_csv") {
      const eventId = body.repricing_event_id;
      if (!eventId?.trim()) {
        throw new HTTPException(400, { message: "REPRICING_EVENT_ID_REQUIRED" });
      }
      const event = await repricing.getEvent(eventId.trim());
      if (!event || event.tenant_id !== tenantId) {
        throw new HTTPException(404, { message: "REPRICING_EVENT_NOT_FOUND" });
      }
      content = repricingEventsToCsv([event], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "adjustment_batch_index_csv") {
      const batchId = body.batch_id?.trim();
      if (!batchId) {
        throw new HTTPException(400, { message: "BATCH_ID_REQUIRED" });
      }
      const batch = await adjustments.getBatch(tenantId, batchId);
      if (!batch) {
        throw new HTTPException(404, { message: "BATCH_NOT_FOUND" });
      }
      content = adjustmentBatchesIndexToCsv([batch], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_digest_date_csv") {
      const date = body.date?.trim();
      if (!date) {
        throw new HTTPException(400, { message: "DIGEST_DATE_REQUIRED" });
      }
      const digest = await buildDailyAgentDigest(
        { catalog, reconciliationAlerts, agentAudit },
        tenantId,
        c.get("locale"),
        date
      );
      content = agentDigestToCsv(digest);
      content_type = "text/csv";
    } else if (kind === "pricing_snapshot_row_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const channel = (body.channel ?? "MERCADO_LIBRE") as
        | "MERCADO_LIBRE"
        | "AMAZON_MX";
      if (channel !== "MERCADO_LIBRE" && channel !== "AMAZON_MX") {
        throw new HTTPException(400, { message: "INVALID_CHANNEL" });
      }
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const rows = await buildPricingSnapshotRows(catalog, tenantId, skuId);
      const row = rows.find((r) => r.channel === channel);
      if (!row) {
        throw new HTTPException(404, { message: "PRICING_SNAPSHOT_ROW_NOT_FOUND" });
      }
      content = pricingSnapshotToCsv([row], new Date().toISOString());
      content_type = "text/csv";
    } else if (kind === "cross_channel_dashboard_row_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
      const item = snapshot.items.find((i) => i.sku_id === skuId);
      if (!item) {
        throw new HTTPException(404, {
          message: "CROSS_CHANNEL_DASHBOARD_ROW_NOT_FOUND",
        });
      }
      content = crossChannelDashboardToCsv({
        ...snapshot,
        sku_count: 1,
        alert_count: item.warning ? 1 : 0,
        items: [item],
      });
      content_type = "text/csv";
    } else if (kind === "competitor_curve_point_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const curveDate = body.curve_date?.trim() ?? body.date?.trim();
      if (!curveDate) {
        throw new HTTPException(400, { message: "CURVE_DATE_REQUIRED" });
      }
      const range = body.range ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const observations = await competitors.listObservations(listingId, since);
      const points = buildCompetitorCurve(
        observations.map((o) => ({
          observed_at: o.observed_at,
          effective_price: o.effective_price,
        }))
      );
      const point = points.find((p) => p.date === curveDate);
      if (!point) {
        throw new HTTPException(404, { message: "COMPETITOR_CURVE_POINT_NOT_FOUND" });
      }
      content = competitorCurvePointsToCsv([point]);
      content_type = "text/csv";
    } else if (kind === "agent_tool_row_csv") {
      const toolName = body.tool_name?.trim();
      if (!toolName) {
        throw new HTTPException(400, { message: "TOOL_NAME_REQUIRED" });
      }
      const tool = getAgentTool(toolName);
      if (!tool) {
        throw new HTTPException(404, { message: "AGENT_TOOL_NOT_FOUND" });
      }
      content = agentToolsToCsv([tool], new Date().toISOString());
      content_type = "text/csv";
    } else {
      throw new HTTPException(400, { message: "UNSUPPORTED_EXPORT_KIND" });
    }
    const stored = createStoredExport({
      tenant_id: tenantId,
      kind,
      content_type,
      body: content,
    });
    return c.json({
      export_id: stored.export_id,
      token: stored.token,
      expires_at: stored.expires_at,
      download_path: `/api/v1/exports/${stored.export_id}?token=${stored.token}`,
    });
  });

  app.get("/api/v1/exports/:exportId", async (c) => {
    const tenantId = c.get("tenantId");
    const token = c.req.query("token") ?? "";
    const row = getStoredExport(tenantId, c.req.param("exportId"), token);
    if (!row) {
      throw new HTTPException(404, { message: "EXPORT_NOT_FOUND" });
    }
    return new Response(row.body, {
      status: 200,
      headers: {
        "Content-Type": row.content_type,
        "Content-Disposition": `attachment; filename="${row.kind}-${row.export_id}.json"`,
      },
    });
  });

  app.get("/api/v1/ops/workers/status", async (c) => {
    return c.json(getAsyncWorkerStatus());
  });

  app.get("/api/v1/ops/workers/status/summary/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const status = getAsyncWorkerStatus();
    const csv = opsWorkersStatusSummaryToCsv(status, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ops-workers-status-summary.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/workers/status/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const status = getAsyncWorkerStatus();
    const csv = workerHeartbeatsToCsv(status.workers, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="worker-heartbeats.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/workers/status/:workerId/export", async (c) => {
    const workerId = c.req.param("workerId");
    const beat = getWorkerHeartbeat(workerId);
    if (!beat) {
      throw new HTTPException(404, { message: "WORKER_HEARTBEAT_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
    const stale =
      Date.now() - new Date(beat.reported_at).getTime() > staleSec * 1000;
    const csv = workerHeartbeatsToCsv([{ ...beat, stale }], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="worker-heartbeat-${workerId}.csv"`,
      },
    });
  });

  app.post("/api/v1/ops/workers/heartbeat", async (c) => {
    const body = (await c.req.json()) as {
      worker_id?: string;
      details?: Record<string, unknown>;
    };
    if (!body.worker_id?.trim()) {
      throw new HTTPException(400, { message: "WORKER_ID_REQUIRED" });
    }
    const beat = recordWorkerHeartbeat({
      worker_id: body.worker_id.trim(),
      details: body.details,
    });
    return c.json({ ok: true, heartbeat: beat });
  });

  app.get("/api/v1/reports/pricing-snapshot", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.query("sku_id") ?? "demo-sku-001";
    const format = (c.req.query("format") ?? "json").toLowerCase();
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const rows = await buildPricingSnapshotRows(catalog, tenantId, skuId);
    if (format === "csv") {
      const csv = pricingSnapshotToCsv(rows, exportedAt);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pricing-snapshot-${skuId}.csv"`,
        },
      });
    }
    return c.json({ exported_at: exportedAt, sku_id: skuId, rows });
  });

  app.get("/api/v1/reports/pricing-snapshot/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.query("sku_id") ?? "demo-sku-001";
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const rows = await buildPricingSnapshotRows(catalog, tenantId, skuId);
    const csv = pricingSnapshotToCsv(rows, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-snapshot-${skuId}.csv"`,
      },
    });
  });

  app.get("/api/v1/reports/pricing-snapshots/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const rows = await buildTenantPricingSnapshotRows(catalog, tenantId);
    const csv = pricingSnapshotToCsv(rows, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-snapshots-tenant.csv"`,
      },
    });
  });

  app.get(
    "/api/v1/reports/pricing-snapshots/:skuId/rows/:channel/export",
    async (c) => {
      const tenantId = c.get("tenantId");
      const skuId = c.req.param("skuId");
      const channel = c.req.param("channel") as "MERCADO_LIBRE" | "AMAZON_MX";
      if (channel !== "MERCADO_LIBRE" && channel !== "AMAZON_MX") {
        throw new HTTPException(400, { message: "INVALID_CHANNEL" });
      }
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      const rows = await buildPricingSnapshotRows(catalog, tenantId, skuId);
      const row = rows.find((r) => r.channel === channel);
      if (!row) {
        throw new HTTPException(404, {
          message: "PRICING_SNAPSHOT_ROW_NOT_FOUND",
        });
      }
      const exportedAt = new Date().toISOString();
      const csv = pricingSnapshotToCsv([row], exportedAt);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pricing-snapshot-row-${skuId}-${channel}.csv"`,
        },
      });
    }
  );

  app.get("/api/v1/reports/reconciliation-alerts", async (c) => {
    const tenantId = c.get("tenantId");
    const format = (c.req.query("format") ?? "json").toLowerCase();
    const exportedAt = new Date().toISOString();
    const items = await reconciliationAlerts.listAlerts(tenantId);
    if (format === "csv") {
      const csv = reconciliationAlertsToCsv(items, exportedAt);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reconciliation-alerts.csv"`,
        },
      });
    }
    return c.json({ exported_at: exportedAt, items });
  });

  app.get("/api/v1/reports/reconciliation-alerts/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const items = await reconciliationAlerts.listAlerts(tenantId);
    const csv = reconciliationAlertsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reconciliation-alerts.csv"`,
      },
    });
  });

  app.get("/api/v1/channels/sandbox/events/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      200,
      Math.max(1, Number(c.req.query("limit") ?? "100") || 100)
    );
    const exportedAt = new Date().toISOString();
    const items = listChannelSandboxEvents(tenantId, limit);
    const csv = channelSandboxEventsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-sandbox-events.csv"`,
      },
    });
  });

  app.get("/api/v1/channels/sandbox/events", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 30;
    return c.json({ items: listChannelSandboxEvents(tenantId, limit) });
  });

  app.get("/api/v1/channels/sandbox/events/:eventId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const eventId = c.req.param("eventId");
    const ev = getChannelSandboxEvent(tenantId, eventId);
    if (!ev) {
      throw new HTTPException(404, { message: "SANDBOX_EVENT_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = channelSandboxEventsToCsv([ev], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-sandbox-event-${eventId}.csv"`,
      },
    });
  });

  app.post("/api/v1/shops", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      channel: "MERCADO_LIBRE" | "AMAZON_MX";
      name: string;
      external_seller_id?: string;
    };
    if (!body.channel || !body.name?.trim()) {
      throw new HTTPException(400, { message: "INVALID_SHOP" });
    }
    const shop = await shops.createShop({
      tenant_id: tenantId,
      channel: body.channel,
      name: body.name.trim(),
      external_seller_id: body.external_seller_id,
    });
    return c.json(shopPublicView(shop), 201);
  });

  app.post("/api/v1/shops/:shopId/oauth/start", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException(404, { message: "SHOP_NOT_FOUND" });
    }
    const result = startOAuth(tenantId, shopId, shop.channel);
    return c.json({
      shop_id: shopId,
      channel: shop.channel,
      ...result,
      mode: "placeholder",
    });
  });

  app.post("/api/v1/shops/:shopId/oauth/mock-complete", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const body = (await c.req.json().catch(() => ({}))) as { state?: string };
    const result = await completeOAuthMock(
      shops,
      tenantId,
      shopId,
      body.state
    );
    if ("error" in result) {
      const status = result.error === "SHOP_NOT_FOUND" ? 404 : 400;
      return c.json({ error: result.error }, status);
    }
    const shop = await shops.getShop(tenantId, shopId);
    return c.json({
      ...result,
      shop: shop ? shopPublicView(shop) : null,
    });
  });

  app.post("/api/v1/shops/:shopId/listings/pull", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException(404, { message: "SHOP_NOT_FOUND" });
    }
    if (shop.auth_status !== "connected" || !shop.external_seller_id) {
      return c.json({ error: "AUTH_REQUIRED" }, 401);
    }
    const token = await shops.getAccessToken(shopId);
    if (!token) {
      return c.json({ error: "AUTH_EXPIRED" }, 401);
    }
    const body = (await c.req.json()) as { external_ref: string };
    if (!body.external_ref) {
      throw new HTTPException(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    const snapshot = await listingAdapter.pullListing(
      {
        shop_id: shopId,
        channel: shop.channel,
        external_seller_id: shop.external_seller_id,
      },
      body.external_ref
    );
    if (isChannelSandboxEnabled()) {
      const listingId = LISTING_ID_BY_SHOP[shopId];
      if (listingId) {
        recordChannelSandboxEvent({
          tenant_id: tenantId,
          listing_id: listingId,
          channel: shop.channel,
          event_type: "listing_pull",
          payload: { external_ref: body.external_ref, snapshot },
        });
      }
    }
    return c.json({ shop_id: shopId, snapshot });
  });

  app.get("/api/v1/listings/:listingId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = listingsToCsv(
      [
        {
          id: listing.id,
          sku_id: listing.sku_id,
          channel: listing.channel,
        },
      ],
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/competitors/anchor/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const withLatest = await mapOffersWithLatestObservations(
      competitors,
      listingId
    );
    const anchor = buildCompetitorAnchorSummary(withLatest);
    const exportedAt = new Date().toISOString();
    const csv = competitorAnchorToCsv(listingId, anchor, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-anchor-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/competitors/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const offers = await mapOffersWithLatestObservations(competitors, listingId);
    const exportedAt = new Date().toISOString();
    const csv = competitorOffersToCsv(listingId, offers, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-offers-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/competitors", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const withLatest = await mapOffersWithLatestObservations(
      competitors,
      listingId
    );
    return c.json({
      listing_id: listingId,
      channel: listing.channel,
      items: withLatest,
      anchor: buildCompetitorAnchorSummary(withLatest),
    });
  });

  app.post("/api/v1/listings/:listingId/competitors", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      external_ref: string;
      label?: string;
      seller_id?: string;
      is_primary?: boolean;
    };
    if (!body.external_ref?.trim()) {
      throw new HTTPException(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    const offer = await competitors.createOffer({
      listing_id: listingId,
      channel: listing.channel,
      external_ref: body.external_ref.trim(),
      label: body.label,
      seller_id: body.seller_id,
      is_primary: body.is_primary,
    });
    return c.json(offer, 201);
  });

  app.get("/api/v1/competitor-offers/:offerId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const offerId = c.req.param("offerId");
    const offer = await competitors.getOffer(offerId);
    if (!offer) {
      throw new HTTPException(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
    }
    const listing = await catalog.getListing(tenantId, offer.listing_id);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const withLatest = await mapOffersWithLatestObservations(
      competitors,
      offer.listing_id
    );
    const row = withLatest.find((o) => o.id === offerId);
    if (!row) {
      throw new HTTPException(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = competitorOffersToCsv(offer.listing_id, [row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-offer-${offerId}.csv"`,
      },
    });
  });

  app.post("/api/v1/competitor-offers/:offerId/observations", async (c) => {
    const tenantId = c.get("tenantId");
    const offerId = c.req.param("offerId");
    const offer = await competitors.getOffer(offerId);
    if (!offer) {
      throw new HTTPException(404, { message: "OFFER_NOT_FOUND" });
    }
    const listing = await catalog.getListing(tenantId, offer.listing_id);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = (await c.req.json()) as {
      list_price?: number;
      sale_price?: number;
      shipping_addon?: number;
      include_shipping?: boolean;
      observed_at?: string;
      source?: string;
      buy_box_winner?: boolean;
    };
    const include_shipping = body.include_shipping ?? false;
    const effective_price = computeEffectivePrice({
      list_price: body.list_price,
      sale_price: body.sale_price,
      shipping_addon: body.shipping_addon,
      include_shipping,
    });
    if (effective_price <= 0) {
      throw new HTTPException(400, { message: "INVALID_PRICE" });
    }
    const previous = await competitors.latestObservation(offerId);
    const observation = await competitors.addObservation({
      offer_id: offerId,
      observed_at: body.observed_at ?? new Date().toISOString(),
      list_price: body.list_price ?? null,
      sale_price: body.sale_price ?? null,
      shipping_addon: body.shipping_addon ?? 0,
      effective_price,
      raw_json: buildObservationRawJson({
        source: body.source,
        buy_box_winner: body.buy_box_winner,
      }),
    });
    await notifyObservationChange(repricing, tenantId, {
      listing_id: offer.listing_id,
      channel: offer.channel,
      offer_id: offerId,
      previous_effective: previous?.effective_price ?? null,
      observation: {
        id: observation.id,
        effective_price: observation.effective_price,
        observed_at: observation.observed_at,
      },
    });
    return c.json(observation, 201);
  });

  app.get("/api/v1/price-observations/:observationId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const observationId = c.req.param("observationId");
    const obs = await competitors.getObservation(observationId);
    if (!obs) {
      throw new HTTPException(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
    }
    const offer = await competitors.getOffer(obs.offer_id);
    if (!offer) {
      throw new HTTPException(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
    }
    const listing = await catalog.getListing(tenantId, offer.listing_id);
    if (!listing) {
      throw new HTTPException(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = priceHistoryToCsv(offer.listing_id, [obs], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-observation-${observationId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/price-history/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const observations = await competitors.listObservations(listingId, since);
    const exportedAt = new Date().toISOString();
    const csv = priceHistoryToCsv(listingId, observations, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-history-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/price-history", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const observations = await competitors.listObservations(listingId, since);
    return c.json({
      listing_id: listingId,
      range,
      observations,
    });
  });

  app.get("/api/v1/listings/:listingId/competitors/curve", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const observations = await competitors.listObservations(listingId, since);
    const points = buildCompetitorCurve(
      observations.map((o) => ({
        observed_at: o.observed_at,
        effective_price: o.effective_price,
      }))
    );
    return c.json({ listing_id: listingId, range, points });
  });

  app.get("/api/v1/listings/:listingId/competitors/curve/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const observations = await competitors.listObservations(listingId, since);
    const points = buildCompetitorCurve(
      observations.map((o) => ({
        observed_at: o.observed_at,
        effective_price: o.effective_price,
      }))
    );
    const csv = competitorCurvePointsToCsv(points);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-curve-${listingId}.csv"`,
      },
    });
  });

  app.get(
    "/api/v1/listings/:listingId/competitors/curve/:curveDate/export",
    async (c) => {
      const tenantId = c.get("tenantId");
      const listingId = c.req.param("listingId");
      const curveDate = c.req.param("curveDate");
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const range = c.req.query("range") ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const observations = await competitors.listObservations(listingId, since);
      const points = buildCompetitorCurve(
        observations.map((o) => ({
          observed_at: o.observed_at,
          effective_price: o.effective_price,
        }))
      );
      const point = points.find((p) => p.date === curveDate);
      if (!point) {
        throw new HTTPException(404, {
          message: "COMPETITOR_CURVE_POINT_NOT_FOUND",
        });
      }
      const csv = competitorCurvePointsToCsv([point]);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="competitor-curve-point-${listingId}-${curveDate}.csv"`,
        },
      });
    }
  );

  app.get("/api/v1/listings/:listingId/ingest/status/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const status = await buildListingIngestStatus(
      { catalog, repricing, listingHealth },
      tenantId,
      listingId
    );
    if (!status) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = listingIngestStatusToCsv(status, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-ingest-status-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/ingest/status", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const status = await buildListingIngestStatus(
      { catalog, repricing, listingHealth },
      tenantId,
      listingId
    );
    if (!status) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    return c.json(status);
  });

  app.post("/api/v1/listings/:listingId/ingest/run", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    try {
      const result = await runMockIngest(
        catalog,
        competitors,
        repricing,
        listingHealth,
        listingAdapter,
        tenantId,
        listingId
      );
      return c.json(result);
    } catch (e) {
      if (e instanceof IngestFailedError) {
        return c.json({ error: "INGEST_FAILED" }, 503);
      }
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/listings/:listingId/repricing-events/flush", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const event = await flushListingDebounce(repricing, tenantId, listingId);
    return c.json({ event });
  });

  app.get("/api/v1/listings/:listingId/repricing-events/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const limit = Math.min(
      200,
      Math.max(1, Number(c.req.query("limit") ?? "100") || 100)
    );
    const items = await repricing.listEvents(tenantId, listingId, limit);
    const exportedAt = new Date().toISOString();
    const csv = repricingEventsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-events-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/repricing-events", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const items = await repricing.listEvents(tenantId, listingId);
    return c.json({ items });
  });

  app.get("/api/v1/repricing-events/:eventId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const eventId = c.req.param("eventId");
    const event = await repricing.getEvent(eventId);
    if (!event || event.tenant_id !== tenantId) {
      throw new HTTPException(404, { message: "REPRICING_EVENT_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = repricingEventsToCsv([event], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-event-${eventId}.csv"`,
      },
    });
  });

  app.post("/api/v1/repricing-events/:eventId/process", async (c) => {
    const tenantId = c.get("tenantId");
    const eventId = c.req.param("eventId");
    try {
      const result = await processRepricingEvent(
        catalog,
        competitors,
        repricing,
        dynamicRules,
        listingHealth,
        repricingActivity,
        tenantId,
        eventId
      );
      return c.json(result);
    } catch (e) {
      if (String(e).includes("EVENT_NOT_FOUND")) {
        throw new HTTPException(404, { message: "EVENT_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.get("/api/v1/listings/:listingId/dynamic-repricing-rule/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const view = await buildListingDynamicRepricingRuleView(
      { catalog, dynamicRules, listingHealth },
      tenantId,
      listingId
    );
    if (!view) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = dynamicRepricingRuleToCsv(view, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dynamic-repricing-rule-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/dynamic-repricing-rule", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const view = await buildListingDynamicRepricingRuleView(
      { catalog, dynamicRules, listingHealth },
      tenantId,
      listingId
    );
    if (!view) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    return c.json({
      rule: view.rule,
      stale: view.stale,
      category_template: view.category_template,
    });
  });

  app.put("/api/v1/listings/:listingId/dynamic-repricing-rule", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = (await c.req.json()) as Record<string, unknown>;
    const rule = await dynamicRules.upsertRule(listingId, {
      enabled: body.enabled as boolean | undefined,
      action: body.action as
        | "suggest"
        | "pending"
        | "auto_pending"
        | "auto_active"
        | undefined,
      anchor_type: body.anchor_type as string | undefined,
      offset: body.offset as { type: "PERCENT" | "FIXED_MXN"; value: number },
      cooldown_min: body.cooldown_min as number | undefined,
      daily_limit: body.daily_limit as number | undefined,
      min_gap_mxn: body.min_gap_mxn as number | undefined,
      frozen: body.frozen as boolean | undefined,
      business_hours_only: body.business_hours_only as boolean | undefined,
    });
    return c.json(rule);
  });

  app.post(
    "/api/v1/listings/:listingId/dynamic-repricing-rule/compile",
    async (c) => {
      const tenantId = c.get("tenantId");
      const listingId = c.req.param("listingId");
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const body = (await c.req.json()) as {
        natural_language?: string;
        session_id?: string;
      };
      if (!body.natural_language?.trim()) {
        throw new HTTPException(400, { message: "NATURAL_LANGUAGE_REQUIRED" });
      }
      const locale = c.get("locale");
      const { draft, explanation, compiler } = await compileRuleViaAdapter(
        body.natural_language,
        locale
      );
      const compiled = storeCompiledDraft({
        tenant_id: tenantId,
        listing_id: listingId,
        source_text: body.natural_language,
        draft,
        explanation,
      });
      await agentAudit.recordInvocation({
        tenant_id: tenantId,
        tool_name: "tool_compile_dynamic_rule",
        session_id: body.session_id ?? null,
        arguments_json: {
          listing_id: listingId,
          natural_language: body.natural_language,
        },
        result_summary: `compile:${compiled.compile_id}`,
      });
      return c.json({
        compile_id: compiled.compile_id,
        draft: compiled.draft,
        explanation: compiled.explanation,
        persisted: false,
        compiler,
      });
    }
  );

  app.post(
    "/api/v1/listings/:listingId/dynamic-repricing-rule/confirm-compiled",
    async (c) => {
      const tenantId = c.get("tenantId");
      const listingId = c.req.param("listingId");
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const body = (await c.req.json()) as {
        compile_id: string;
        draft?: Partial<DynamicRuleDraft>;
      };
      if (!body.compile_id) {
        throw new HTTPException(400, { message: "COMPILE_ID_REQUIRED" });
      }
      const compiled = takeCompiledDraft(tenantId, listingId, body.compile_id);
      if (!compiled) {
        throw new HTTPException(404, { message: "COMPILE_NOT_FOUND" });
      }
      const merged = { ...compiled.draft, ...body.draft };
      const rule = await dynamicRules.upsertRule(listingId, merged);
      await agentAudit.recordInvocation({
        tenant_id: tenantId,
        tool_name: "tool_confirm_dynamic_rule",
        session_id: null,
        arguments_json: {
          listing_id: listingId,
          compile_id: body.compile_id,
        },
        result_summary: `rule:${rule.action}:${rule.anchor_type}`,
      });
      return c.json({ rule, compile_id: body.compile_id, persisted: true });
    }
  );

  app.post(
    "/api/v1/listings/:listingId/dynamic-repricing-rule/unfreeze",
    async (c) => {
      const tenantId = c.get("tenantId");
      const listingId = c.req.param("listingId");
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      const rule = await dynamicRules.unfreeze(listingId);
      return c.json(rule ?? { listing_id: listingId, frozen: false });
    }
  );

  app.post("/api/v1/listings/:listingId/competitors/stale-check", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const result = await evaluateListingStale(
      competitors,
      listingHealth,
      listingId
    );
    const stale = await listingHealth.getStale(listingId);
    return c.json({ ...result, ...stale });
  });

  app.post("/api/v1/listings/:listingId/channel-publish", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const body = (await c.req.json().catch(() => ({}))) as {
      version_id?: string;
      explicit_price_mxn?: number;
      retry_on_step?: boolean;
      idempotency_key?: string;
    };
    try {
      const result = await publishListingPrice(
        catalog,
        shops,
        dynamicRules,
        publishAdapter,
        tenantId,
        listingId,
        {
          ...body,
          retry_on_step: body.retry_on_step ?? true,
        }
      );
      if (result.publish_status === "failed") {
        const status =
          result.error_code === "AUTH_REQUIRED" ||
          result.error_code === "AUTH_EXPIRED"
            ? 401
            : 422;
        return c.json(result, status);
      }
      return c.json(result);
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/shops/:shopId/channel-publish", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const listingId = LISTING_ID_BY_SHOP[shopId];
    if (!listingId) {
      throw new HTTPException(404, { message: "SHOP_NOT_FOUND" });
    }
    const body = (await c.req.json().catch(() => ({}))) as {
      retry_on_step?: boolean;
      idempotency_key?: string;
    };
    try {
      const result = await publishListingPrice(
        catalog,
        shops,
        dynamicRules,
        publishAdapter,
        tenantId,
        listingId,
        {
          retry_on_step: body.retry_on_step ?? true,
          idempotency_key: body.idempotency_key,
        }
      );
      if (result.publish_status === "failed") {
        const status =
          result.error_code === "AUTH_REQUIRED" ||
          result.error_code === "AUTH_EXPIRED"
            ? 401
            : 422;
        return c.json(result, status);
      }
      return c.json({ shop_id: shopId, listing_id: listingId, ...result });
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.post("/api/v1/channel-publish/batch", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      listing_ids: string[];
      retry_on_step?: boolean;
      idempotency_key?: string;
    };
    if (!Array.isArray(body.listing_ids) || body.listing_ids.length === 0) {
      throw new HTTPException(400, { message: "INVALID_LISTING_IDS" });
    }
    try {
      const result = await publishListingPriceBatch(
        catalog,
        shops,
        dynamicRules,
        publishAdapter,
        tenantId,
        body.listing_ids,
        {
          retry_on_step: body.retry_on_step ?? true,
          idempotency_key: body.idempotency_key,
        }
      );
      const status = result.publish_status === "all_failed" ? 422 : 200;
      return c.json(result, status);
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.get("/api/v1/skus/:skuId/repricing-queue/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    try {
      const rows = await buildSkuRepricingQueueRows(catalog, tenantId, skuId);
      const exportedAt = new Date().toISOString();
      const csv = repricingQueueToCsv(rows, exportedAt);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="repricing-queue-${skuId}.csv"`,
        },
      });
    } catch (e) {
      if (String(e).includes("SKU_NOT_FOUND")) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.get("/api/v1/skus/:skuId/repricing-queue", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    try {
      const queue = await listRepricingQueue(catalog, tenantId, skuId);
      return c.json(queue);
    } catch (e) {
      if (String(e).includes("SKU_NOT_FOUND")) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.get("/api/v1/repricing-queue/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const rows = await buildTenantRepricingQueue(catalog, tenantId);
    const csv = repricingQueueToCsv(rows, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-queue-tenant.csv"`,
      },
    });
  });

  app.post("/api/v1/repricing-queue/promote-pending", async (c) => {
    const body = (await c.req.json()) as { version_ids?: string[] };
    if (!body.version_ids?.length) {
      throw new HTTPException(400, { message: "INVALID_VERSION_IDS" });
    }
    const result = await promoteVersionsToPending(catalog, body.version_ids);
    return c.json(result);
  });

  app.get("/api/v1/skus/:skuId/repricing-batch/shard-plan/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const shardTotalRaw = c.req.query("shard_total") ?? "2";
    const shardTotal = Number.parseInt(shardTotalRaw, 10);
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException(400, { message: "INVALID_SHARD_TOTAL" });
    }
    const exportedAt = new Date().toISOString();
    const plan = planRepricingShards(tenantId, skuId, shardTotal);
    const csv = repricingBatchShardPlanToCsv(plan, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-shard-plan-${skuId}.csv"`,
      },
    });
  });

  app.get("/api/v1/skus/:skuId/repricing-batch/shard-plan", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const shardTotalRaw = c.req.query("shard_total") ?? "2";
    const shardTotal = Number.parseInt(shardTotalRaw, 10);
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException(400, { message: "INVALID_SHARD_TOTAL" });
    }
    return c.json(planRepricingShards(tenantId, skuId, shardTotal));
  });

  app.post("/api/v1/skus/:skuId/repricing-batch/recompute", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = (await c.req.json()) as {
      shard_index?: number;
      shard_total?: number;
    };
    const shardTotal = body.shard_total ?? 2;
    const shardIndex = body.shard_index ?? 0;
    if (
      !Number.isFinite(shardTotal) ||
      shardTotal < 1 ||
      shardTotal > 64 ||
      !Number.isFinite(shardIndex) ||
      shardIndex < 0 ||
      shardIndex >= shardTotal
    ) {
      throw new HTTPException(400, { message: "INVALID_SHARD_PARAMS" });
    }
    const result = await runRepricingBatchShard({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity,
      tenantId,
      skuId,
      shardIndex,
      shardTotal,
    });
    if ("error" in result) {
      if (result.error === "SKU_NOT_FOUND") {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      throw new HTTPException(400, { message: result.error });
    }
    return c.json(result);
  });

  app.post("/api/v1/skus/:skuId/repricing-batch/recompute-all", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = (await c.req.json().catch(() => ({}))) as {
      shard_total?: number;
    };
    const shardTotal = body.shard_total ?? 2;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException(400, { message: "INVALID_SHARD_TOTAL" });
    }
    const result = await runRepricingBatchAllShards({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity,
      tenantId,
      skuId,
      shardTotal,
    });
    if ("error" in result) {
      throw new HTTPException(404, { message: result.error });
    }
    return c.json(result);
  });

  app.post("/api/v1/repricing-batch/recompute-all", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json().catch(() => ({}))) as {
      shard_total?: number;
      sku_ids?: string[];
    };
    const shardTotal = body.shard_total ?? 2;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException(400, { message: "INVALID_SHARD_TOTAL" });
    }
    const result = await runRepricingBatchForTenant({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity,
      tenantId,
      shardTotal,
      skuIds: body.sku_ids,
    });
    return c.json(result);
  });

  app.post("/api/v1/repricing-batch/jobs/enqueue", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      scope?: "tenant" | "sku";
      sku_id?: string;
      shard_total?: number;
      sku_ids?: string[];
    };
    const scope = body.scope ?? "tenant";
    const shardTotal = body.shard_total ?? 2;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException(400, { message: "INVALID_SHARD_TOTAL" });
    }
    if (scope === "sku") {
      if (!body.sku_id?.trim()) {
        throw new HTTPException(400, { message: "SKU_ID_REQUIRED" });
      }
      const sku = await catalog.getSku(tenantId, body.sku_id);
      if (!sku) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
    }
    try {
      const job = await enqueueRepricingBatchJob({
        tenant_id: tenantId,
        scope,
        sku_id: body.sku_id,
        shard_total: shardTotal,
        sku_ids: body.sku_ids,
      });
      return c.json({ job }, 201);
    } catch (e) {
      if (String(e).includes("SKU_ID_REQUIRED")) {
        throw new HTTPException(400, { message: "SKU_ID_REQUIRED" });
      }
      throw e;
    }
  });

  app.get("/api/v1/repricing-batch/jobs/summary/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const summary = await summarizeRepricingBatchJobs(tenantId, limit);
    const csv = repricingBatchJobsSummaryToCsv(summary, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-jobs-summary.csv"`,
      },
    });
  });

  app.get("/api/v1/repricing-batch/jobs/summary", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    return c.json(await summarizeRepricingBatchJobs(tenantId, limit));
  });

  app.get("/api/v1/repricing-batch/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const jobs = await listRepricingBatchJobs(tenantId, limit);
    const csv = repricingBatchJobsToCsv(jobs, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-jobs.csv"`,
      },
    });
  });

  app.get("/api/v1/repricing-batch/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: await listRepricingBatchJobs(tenantId, limit) });
  });

  app.get("/api/v1/repricing-batch/jobs/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const job = await getRepricingBatchJob(tenantId, c.req.param("jobId"));
    if (!job) {
      throw new HTTPException(404, { message: "JOB_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = repricingBatchJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-job-${job.job_id}.csv"`,
      },
    });
  });

  app.get("/api/v1/repricing-batch/jobs/:jobId", async (c) => {
    const tenantId = c.get("tenantId");
    const job = await getRepricingBatchJob(tenantId, c.req.param("jobId"));
    if (!job) {
      throw new HTTPException(404, { message: "JOB_NOT_FOUND" });
    }
    return c.json(job);
  });

  app.post("/api/v1/repricing-batch/jobs/process", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json().catch(() => ({}))) as { limit?: number };
    const limit =
      body.limit != null ? Math.min(20, Math.max(1, body.limit)) : 5;
    const out = await processRepricingBatchQueue(
      {
        catalog,
        competitors,
        repricing,
        dynamicRules,
        listingHealth,
        repricingActivity,
      },
      tenantId,
      limit,
      {
        worker_id:
          c.req.header("X-Repricing-Worker-Id")?.trim() || "bff-inline",
      }
    );
    return c.json(out);
  });

  app.get("/api/v1/category-rule-templates", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json({ items: listCategoryRuleTemplates(tenantId) });
  });

  app.get("/api/v1/category-rule-templates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const templates = listCategoryRuleTemplates(tenantId);
    const csv = categoryRuleTemplatesToCsv(templates, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="category-rule-templates.csv"`,
      },
    });
  });

  app.get("/api/v1/category-rule-templates/:categoryId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const tpl = getCategoryRuleTemplate(tenantId, c.req.param("categoryId"));
    if (!tpl) {
      throw new HTTPException(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = categoryRuleTemplatesToCsv([tpl], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="category-rule-template-${tpl.category_id}.csv"`,
      },
    });
  });

  app.get("/api/v1/category-rule-templates/:categoryId", async (c) => {
    const tenantId = c.get("tenantId");
    const tpl = getCategoryRuleTemplate(tenantId, c.req.param("categoryId"));
    if (!tpl) {
      throw new HTTPException(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
    }
    return c.json(tpl);
  });

  app.get("/api/v1/tenants/:tenantId/shared-fee-templates/export", async (c) => {
    const tenantId = c.req.param("tenantId");
    const headerTenant = c.get("tenantId");
    if (tenantId !== headerTenant) {
      throw new HTTPException(403, { message: "TENANT_MISMATCH" });
    }
    const exportedAt = new Date().toISOString();
    const csv = sharedFeeTemplatesToCsv(
      listSharedFeeTemplates(tenantId),
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shared-fee-templates-${tenantId}.csv"`,
      },
    });
  });

  app.get("/api/v1/tenants/:tenantId/shared-fee-templates", async (c) => {
    const tenantId = c.req.param("tenantId");
    const headerTenant = c.get("tenantId");
    if (tenantId !== headerTenant) {
      throw new HTTPException(403, { message: "TENANT_MISMATCH" });
    }
    return c.json({ items: listSharedFeeTemplates(tenantId) });
  });

  app.get("/api/v1/shared-fee-templates/:templateId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const templateId = c.req.param("templateId");
    const tpl = getSharedFeeTemplate(tenantId, templateId);
    if (!tpl) {
      throw new HTTPException(404, { message: "SHARED_FEE_TEMPLATE_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = sharedFeeTemplatesToCsv([tpl], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shared-fee-template-${templateId}.csv"`,
      },
    });
  });

  app.get("/api/v1/shared-fee-templates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const templates = listSharedFeeTemplates(tenantId);
    const csv = sharedFeeTemplatesToCsv(templates, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shared-fee-templates.csv"`,
      },
    });
  });

  app.post("/api/v1/skus/:skuId/apply-shared-fee-template", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = (await c.req.json()) as { template_id?: string };
    if (!body.template_id?.trim()) {
      throw new HTTPException(400, { message: "TEMPLATE_ID_REQUIRED" });
    }
    const result = await applySharedFeeTemplateToSku(
      catalog,
      tenantId,
      skuId,
      body.template_id.trim()
    );
    if (!result) {
      throw new HTTPException(404, { message: "SKU_OR_TEMPLATE_NOT_FOUND" });
    }
    return c.json(result);
  });

  app.get("/api/v1/skus/:skuId/category-rule-template/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const categoryId = sku.category_id ?? null;
    const template = categoryId
      ? getCategoryRuleTemplate(tenantId, categoryId)
      : undefined;
    const exportedAt = new Date().toISOString();
    const csv = skuCategoryRuleTemplateToCsv(
      skuId,
      categoryId,
      template ?? null,
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sku-category-rule-template-${skuId}.csv"`,
      },
    });
  });

  app.get("/api/v1/skus/:skuId/category-rule-template", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    if (!sku.category_id) {
      return c.json({ template: null });
    }
    const template = getCategoryRuleTemplate(tenantId, sku.category_id);
    if (!template) {
      return c.json({ template: null, category_id: sku.category_id });
    }
    return c.json({ category_id: sku.category_id, template });
  });

  app.get("/api/v1/reconciliation-alerts/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const items = await reconciliationAlerts.listAlerts(tenantId);
    const csv = reconciliationAlertsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reconciliation-alerts.csv"`,
      },
    });
  });

  app.get("/api/v1/reconciliation-alerts/:alertId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const alertId = c.req.param("alertId");
    const items = await reconciliationAlerts.listAlerts(tenantId);
    const alert = items.find((a) => a.id === alertId);
    if (!alert) {
      throw new HTTPException(404, { message: "RECONCILIATION_ALERT_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = reconciliationAlertsToCsv([alert], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reconciliation-alert-${alertId}.csv"`,
      },
    });
  });

  app.get("/api/v1/reconciliation-alerts", async (c) => {
    const tenantId = c.get("tenantId");
    const items = await reconciliationAlerts.listAlerts(tenantId);
    return c.json({ items });
  });

  app.get("/api/v1/ops/listing-sync/schedule/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const csv = listingSyncScheduleToCsv(
      getListingSyncSchedule(tenantId),
      exportedAt
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-schedule.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/listing-sync/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(getListingSyncSchedule(tenantId));
  });

  app.put("/api/v1/ops/listing-sync/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      enabled?: boolean;
      cron_expression?: string;
    };
    try {
      return c.json(upsertListingSyncSchedule(tenantId, body));
    } catch (e) {
      if (String(e).includes("INVALID_CRON_EXPRESSION")) {
        throw new HTTPException(400, { message: "INVALID_CRON_EXPRESSION" });
      }
      throw e;
    }
  });

  app.get("/api/v1/ops/listing-sync/status", async (c) => {
    const tenantId = c.get("tenantId");
    const sample = Math.min(
      100,
      Math.max(1, Number(c.req.query("sample") ?? "50") || 50)
    );
    return c.json(buildListingSyncOpsStatus(tenantId, sample));
  });

  app.get("/api/v1/ops/listing-sync/status/export", async (c) => {
    const tenantId = c.get("tenantId");
    const sample = Math.min(
      100,
      Math.max(1, Number(c.req.query("sample") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const status = buildListingSyncOpsStatus(tenantId, sample);
    const csv = listingSyncOpsStatusToCsv(status, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-ops-status.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/listing-sync/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const jobs = listListingSyncJobsForTenant(tenantId, limit);
    const csv = listingSyncJobsToCsv(jobs, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-jobs.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/listing-sync/jobs/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const job = getListingSyncJob(tenantId, jobId);
    if (!job) {
      throw new HTTPException(404, { message: "LISTING_SYNC_JOB_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = listingSyncJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-job-${jobId}.csv"`,
      },
    });
  });

  app.get("/api/v1/ops/listing-sync/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      50,
      Math.max(1, Number(c.req.query("limit") ?? "20") || 20)
    );
    return c.json({ items: listListingSyncJobsForTenant(tenantId, limit) });
  });

  app.post("/api/v1/ops/listing-sync/run-due", async (c) => {
    const tenantId = c.get("tenantId");
    const force = c.req.query("force") === "true";
    const result = await runDueListingChannelSyncs(
      catalog,
      shops,
      listingAdapter,
      tenantId,
      { force }
    );
    if (result.skipped) {
      throw new HTTPException(409, { message: "SCHEDULE_DISABLED" });
    }
    return c.json({
      schedule: getListingSyncSchedule(tenantId),
      runs: result.runs,
    });
  });

  app.get("/api/v1/listings/:listingId/sync/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const jobs = listListingSyncJobs(tenantId, listingId, limit);
    const csv = listingSyncJobsToCsv(jobs, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-jobs-${listingId}.csv"`,
      },
    });
  });

  app.get("/api/v1/listings/:listingId/sync/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    return c.json({
      items: listListingSyncJobs(tenantId, listingId),
    });
  });

  app.post("/api/v1/listings/:listingId/sync", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const body = (await c.req.json()) as { external_ref?: string };
    if (!body.external_ref?.trim()) {
      throw new HTTPException(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    try {
      const result = await runListingChannelSync(
        catalog,
        shops,
        listingAdapter,
        tenantId,
        listingId,
        body.external_ref.trim()
      );
      if (result.job.status === "failed") {
        return c.json(
          { job: result.job, error: result.error ?? "SYNC_FAILED" },
          502
        );
      }
      return c.json({ job: result.job, snapshot: result.snapshot });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      if (msg.includes("AUTH_REQUIRED") || msg.includes("AUTH_EXPIRED")) {
        return c.json({ error: msg.split(":")[0] }, 401);
      }
      throw e;
    }
  });

  app.post("/api/v1/listings/:listingId/reconcile", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const body = (await c.req.json()) as {
      external_ref: string;
      tolerance_mxn?: number;
    };
    if (!body.external_ref?.trim()) {
      throw new HTTPException(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    try {
      const result = await reconcileListingChannelPrice(
        catalog,
        shops,
        listingAdapter,
        reconciliationAlerts,
        tenantId,
        listingId,
        body
      );
      return c.json(result);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      if (msg.includes("AUTH_REQUIRED") || msg.includes("AUTH_EXPIRED")) {
        return c.json({ error: msg.includes("AUTH_EXPIRED") ? "AUTH_EXPIRED" : "AUTH_REQUIRED" }, 401);
      }
      if (msg.includes("NO_ACTIVE_VERSION")) {
        return c.json({ error: "NO_ACTIVE_VERSION" }, 422);
      }
      throw e;
    }
  });

  app.get("/api/v1/agent/tools/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = agentToolsToCsv(listAgentTools(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tools.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/tools/:toolName/export", async (c) => {
    const toolName = decodeURIComponent(c.req.param("toolName"));
    const tool = getAgentTool(toolName);
    if (!tool) {
      throw new HTTPException(404, { message: "AGENT_TOOL_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = agentToolsToCsv([tool], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tool-${toolName}.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/tools", async (c) => {
    return c.json({ items: listAgentTools() });
  });

  app.get("/api/v1/agent/readiness/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = agentReadinessToCsv(evaluateAgentReadiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-readiness.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/readiness", async (c) => {
    return c.json(evaluateAgentReadiness());
  });

  app.get("/api/v1/agent/milestones/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = agentMilestonesToCsv(getProductMilestoneStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-milestones.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/milestones", async (c) => {
    return c.json(getProductMilestoneStatus());
  });

  app.get("/api/v1/product/readiness/p3/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = p3ReadinessToCsv(evaluateP3Readiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="p3-readiness.csv"`,
      },
    });
  });

  app.get("/api/v1/product/readiness/p4/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = p4ReadinessToCsv(evaluateAgentReadiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="p4-readiness.csv"`,
      },
    });
  });

  app.get("/api/v1/product/readiness/p5/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = p5ReadinessToCsv(evaluateP5Readiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="p5-readiness.csv"`,
      },
    });
  });

  app.get("/api/v1/product/readiness/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = productReadinessToCsv(getProductReadinessSummary(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="product-readiness.csv"`,
      },
    });
  });

  app.get("/api/v1/product/readiness", async (c) => {
    return c.json(getProductReadinessSummary());
  });

  app.get("/api/v1/rule-compiler/status/export", async (c) => {
    const exportedAt = new Date().toISOString();
    const csv = ruleCompilerStatusToCsv(getRuleCompilerStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rule-compiler-status.csv"`,
      },
    });
  });

  app.get("/api/v1/rule-compiler/status", async (c) => {
    return c.json(getRuleCompilerStatus());
  });

  app.post("/api/v1/agent/copilot/sessions", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const body = (await c.req.json().catch(() => ({}))) as {
      listing_id?: string;
      sku_id?: string;
      channel?: "MERCADO_LIBRE" | "AMAZON_MX";
      bootstrap_context?: boolean;
    };
    const session = createCopilotSession({
      tenant_id: tenantId,
      listing_id: body.listing_id ?? null,
      sku_id: body.sku_id ?? null,
    });
    const bootstrap = body.bootstrap_context !== false && Boolean(body.sku_id);
    if (bootstrap && body.sku_id) {
      appendCopilotAssistantMessage(
        tenantId,
        session.session_id,
        copilotWelcomeMessage(locale)
      );
      try {
        const toolOut = await invokeAgentTool(
          { catalog, competitors, adjustments, audit: agentAudit },
          { tenantId, locale, sessionId: session.session_id },
          "tool_get_pricing_context",
          {
            sku_id: body.sku_id,
            channel: body.channel,
          }
        );
        const narrative = buildPricingContextNarrative(
          toolOut.result as Parameters<typeof buildPricingContextNarrative>[0],
          locale
        );
        appendCopilotAssistantMessage(
          tenantId,
          session.session_id,
          narrative
        );
      } catch {
        appendCopilotAssistantMessage(
          tenantId,
          session.session_id,
          locale === "es-MX"
            ? "No se pudo cargar el contexto de precios."
            : locale === "zh-CN"
              ? "无法加载定价上下文。"
              : "Could not load pricing context."
        );
      }
    }
    const updated = getCopilotSession(tenantId, session.session_id)!;
    return c.json({
      session_id: updated.session_id,
      listing_id: updated.listing_id,
      sku_id: updated.sku_id,
      created_at: updated.created_at,
      messages: updated.messages,
      context_bootstrapped: bootstrap,
    });
  });

  app.get("/api/v1/agent/digest/daily/export", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const date = c.req.query("date");
    const digest = await buildDailyAgentDigest(
      { catalog, reconciliationAlerts, agentAudit },
      tenantId,
      locale,
      date
    );
    const csv = agentDigestToCsv(digest);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-digest-${digest.date}.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/daily/:date/export", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const date = c.req.param("date");
    const digest = await buildDailyAgentDigest(
      { catalog, reconciliationAlerts, agentAudit },
      tenantId,
      locale,
      date
    );
    const csv = agentDigestToCsv(digest);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-digest-${digest.date}.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/daily", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const date = c.req.query("date");
    const digest = await buildDailyAgentDigest(
      { catalog, reconciliationAlerts, agentAudit },
      tenantId,
      locale,
      date
    );
    return c.json(digest);
  });

  app.get("/api/v1/agent/digest/schedule/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = new Date().toISOString();
    const csv = digestScheduleToCsv(getDigestSchedule(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-schedule.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(getDigestSchedule(tenantId));
  });

  app.put("/api/v1/agent/digest/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      enabled?: boolean;
      cron?: string;
      email_to?: string;
      timezone?: string;
    };
    try {
      const schedule = upsertDigestSchedule(tenantId, body);
      return c.json(schedule);
    } catch (e) {
      if (String(e).includes("INVALID_CRON_EXPRESSION")) {
        throw new HTTPException(400, { message: "INVALID_CRON_EXPRESSION" });
      }
      throw e;
    }
  });

  app.post("/api/v1/agent/digest/run-due", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const force = c.req.query("force") === "true";
    const date = c.req.query("date");
    const result = await runDueDigestDispatch(
      { catalog, reconciliationAlerts, agentAudit },
      tenantId,
      locale,
      { force, date }
    );
    if (result.skipped) {
      throw new HTTPException(409, { message: "DIGEST_SCHEDULE_DISABLED" });
    }
    await agentAudit.recordInvocation({
      tenant_id: tenantId,
      tool_name: "tool_digest_run_due",
      session_id: null,
      arguments_json: { job_id: result.record.job_id, force },
      result_summary: `digest:${result.record.job_id}`,
    });
    return c.json({
      job: result.record,
      digest: result.digest,
      schedule: result.schedule,
    });
  });

  app.post("/api/v1/agent/digest/daily/dispatch", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const body = (await c.req.json().catch(() => ({}))) as {
      date?: string;
      channels?: Array<"email_stub">;
    };
    const { record, digest } = await dispatchDailyDigest(
      { catalog, reconciliationAlerts, agentAudit },
      tenantId,
      locale,
      body
    );
    await agentAudit.recordInvocation({
      tenant_id: tenantId,
      tool_name: "tool_digest_dispatch",
      session_id: null,
      arguments_json: { date: record.date, job_id: record.job_id },
      result_summary: `digest:${record.job_id}`,
    });
    return c.json({ job: record, digest });
  });

  app.get("/api/v1/agent/digest/dispatches/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const items = listDigestDispatches(tenantId, limit);
    const csv = digestDispatchesToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dispatches.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/dispatches", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: listDigestDispatches(tenantId, limit) });
  });

  app.get("/api/v1/agent/digest/dispatches/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const dispatch = getDigestDispatch(tenantId, jobId);
    if (!dispatch) {
      throw new HTTPException(404, { message: "DIGEST_DISPATCH_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = digestDispatchesToCsv([dispatch], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dispatch-${jobId}.csv"`,
      },
    });
  });

  app.post("/api/v1/agent/digest/daily/enqueue", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const body = (await c.req.json().catch(() => ({}))) as {
      date?: string;
      channels?: Array<"email_stub" | "webhook_queue" | "smtp_queue">;
      simulate_poison?: boolean;
    };
    const job = enqueueDailyDigestJob({
      tenant_id: tenantId,
      locale,
      date: body.date,
      channels: body.channels,
      simulate_poison: body.simulate_poison,
    });
    return c.json({ job });
  });

  app.get("/api/v1/agent/digest/jobs/summary/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      50,
      Math.max(1, Number(c.req.query("limit") ?? "20") || 20)
    );
    const exportedAt = new Date().toISOString();
    const jobs = listDigestQueuedJobs(tenantId, limit);
    const summary = buildDigestQueuedJobsSummary(tenantId, jobs);
    const csv = digestQueuedJobsSummaryToCsv(summary, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-queued-jobs-summary.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/jobs/summary", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      50,
      Math.max(1, Number(c.req.query("limit") ?? "20") || 20)
    );
    const jobs = listDigestQueuedJobs(tenantId, limit);
    return c.json(buildDigestQueuedJobsSummary(tenantId, jobs));
  });

  app.get("/api/v1/agent/digest/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const jobs = listDigestQueuedJobs(tenantId, limit);
    const csv = digestQueuedJobsToCsv(jobs, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-queued-jobs.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: listDigestQueuedJobs(tenantId, limit) });
  });

  app.get("/api/v1/agent/digest/jobs/dead-letter/summary/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      50,
      Math.max(1, Number(c.req.query("limit") ?? "20") || 20)
    );
    const exportedAt = new Date().toISOString();
    const jobs = listDigestDeadLetterJobs(tenantId, limit);
    const summary = buildDigestDeadLetterSummary(
      tenantId,
      jobs,
      digestQueueSummary(tenantId)
    );
    const csv = digestDeadLetterSummaryToCsv(summary, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dead-letter-summary.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/jobs/dead-letter/summary", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      50,
      Math.max(1, Number(c.req.query("limit") ?? "20") || 20)
    );
    const jobs = listDigestDeadLetterJobs(tenantId, limit);
    return c.json(
      buildDigestDeadLetterSummary(tenantId, jobs, digestQueueSummary(tenantId))
    );
  });

  app.get("/api/v1/agent/digest/jobs/dead-letter/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit") ?? "50") || 50)
    );
    const exportedAt = new Date().toISOString();
    const jobs = listDigestDeadLetterJobs(tenantId, limit);
    const csv = digestDeadLetterJobsToCsv(jobs, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dead-letter.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/jobs/dead-letter/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const job = getDigestQueuedJob(tenantId, jobId);
    if (!job || job.status !== "dead_letter") {
      throw new HTTPException(404, {
        message: "DIGEST_DEAD_LETTER_JOB_NOT_FOUND",
      });
    }
    const exportedAt = new Date().toISOString();
    const csv = digestDeadLetterJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dead-letter-job-${jobId}.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/jobs/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const job = getDigestQueuedJob(tenantId, jobId);
    if (!job) {
      throw new HTTPException(404, { message: "DIGEST_JOB_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = digestQueuedJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-queued-job-${jobId}.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/digest/jobs/dead-letter", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: listDigestDeadLetterJobs(tenantId, limit) });
  });

  app.post("/api/v1/agent/digest/jobs/process", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json().catch(() => ({}))) as { limit?: number };
    const limit =
      body.limit != null ? Math.min(20, Math.max(1, body.limit)) : 5;
    const out = await processDigestQueue(
      { catalog, reconciliationAlerts, agentAudit },
      tenantId,
      limit
    );
    for (const job of out.processed) {
      if (job.status === "completed") {
        await agentAudit.recordInvocation({
          tenant_id: tenantId,
          tool_name: "tool_digest_dispatch",
          session_id: null,
          arguments_json: { job_id: job.job_id, queued: true },
          result_summary: `digest:${job.job_id}`,
        });
      }
    }
    return c.json(out);
  });

  app.get("/api/v1/agent/copilot/sessions/:sessionId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const sessionId = c.req.param("sessionId");
    const session = getCopilotSession(tenantId, sessionId);
    if (!session) {
      throw new HTTPException(404, { message: "SESSION_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = copilotSessionToCsv(session, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="copilot-session-${sessionId}.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/copilot/sessions/:sessionId", async (c) => {
    const tenantId = c.get("tenantId");
    const sessionId = c.req.param("sessionId");
    const session = getCopilotSession(tenantId, sessionId);
    if (!session) {
      throw new HTTPException(404, { message: "SESSION_NOT_FOUND" });
    }
    return c.json(session);
  });

  app.post("/api/v1/agent/copilot/sessions/:sessionId/messages", async (c) => {
    const tenantId = c.get("tenantId");
    const sessionId = c.req.param("sessionId");
    const body = (await c.req.json()) as {
      content?: string;
      listing_id?: string;
    };
    if (!body.content?.trim()) {
      throw new HTTPException(400, { message: "CONTENT_REQUIRED" });
    }
    const listingId =
      body.listing_id ??
      getCopilotSession(tenantId, sessionId)?.listing_id ??
      null;
    if (!listingId) {
      throw new HTTPException(400, { message: "LISTING_ID_REQUIRED" });
    }
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    try {
      const session = getCopilotSession(tenantId, sessionId);
      const skuId = session?.sku_id ?? listing.sku_id;
      const turn = await appendCopilotUserTurn({
        tenant_id: tenantId,
        session_id: sessionId,
        content: body.content,
        locale: c.get("locale"),
        listing_id: listingId,
        sku_id: skuId,
        channel: listing.channel,
        deps: { catalog, competitors, adjustments, audit: agentAudit },
      });
      await agentAudit.recordInvocation({
        tenant_id: tenantId,
        tool_name: "tool_copilot_turn",
        session_id: sessionId,
        arguments_json: {
          listing_id: listingId,
          content: body.content,
          intent: turn.intent,
          needs_clarification: turn.needs_clarification,
        },
        result_summary:
          turn.intent === "simulate"
            ? "simulate"
            : turn.compile_id
              ? `compile:${turn.compile_id}`
              : "clarify",
      });
      return c.json({
        session_id: sessionId,
        intent: turn.intent,
        needs_clarification: turn.needs_clarification,
        compile_id: turn.compile_id,
        draft: turn.draft,
        explanation: turn.explanation,
        compiler: turn.compiler,
        messages: turn.session.messages,
      });
    } catch (e) {
      if (String(e).includes("SESSION_NOT_FOUND")) {
        throw new HTTPException(404, { message: "SESSION_NOT_FOUND" });
      }
      throw e;
    }
  });

  app.get("/api/v1/agent/tool-audit/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(
      200,
      Math.max(1, Number(c.req.query("limit") ?? "100") || 100)
    );
    const exportedAt = new Date().toISOString();
    const items = await agentAudit.listInvocations(tenantId, limit);
    const csv = agentToolAuditToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tool-audit.csv"`,
      },
    });
  });

  app.get("/api/v1/agent/tool-audit", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 100;
    const items = await agentAudit.listInvocations(tenantId, limit);
    return c.json({ items });
  });

  app.get("/api/v1/agent/tool-audit/:auditId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const auditId = c.req.param("auditId");
    const items = await agentAudit.listInvocations(tenantId, 200);
    const row = items.find((a) => a.id === auditId);
    if (!row) {
      throw new HTTPException(404, { message: "AGENT_TOOL_AUDIT_NOT_FOUND" });
    }
    const exportedAt = new Date().toISOString();
    const csv = agentToolAuditToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tool-audit-${auditId}.csv"`,
      },
    });
  });

  app.post("/api/v1/agent/tools/invoke", async (c) => {
    const tenantId = c.get("tenantId");
    const body = (await c.req.json()) as {
      tool: string;
      arguments?: Record<string, unknown>;
      session_id?: string;
    };
    if (!body.tool) {
      throw new HTTPException(400, { message: "TOOL_REQUIRED" });
    }
    try {
      const out = await invokeAgentTool(
        { catalog, competitors, adjustments, audit: agentAudit },
        {
          tenantId,
          locale: c.get("locale"),
          sessionId: body.session_id,
        },
        body.tool,
        body.arguments ?? {}
      );
      return c.json(out);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("UNKNOWN_TOOL") || msg.includes("TOOL_NOT_ALLOWED")) {
        return c.json({ error: msg.includes("TOOL_NOT_ALLOWED") ? "TOOL_NOT_ALLOWED" : "UNKNOWN_TOOL" }, 400);
      }
      if (msg.includes("SKU_NOT_FOUND")) {
        throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
      }
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ error: "GUARD_REJECTED" }, 422);
      }
      if (msg.includes("ITEMS_REQUIRED")) {
        throw new HTTPException(400, { message: "ITEMS_REQUIRED" });
      }
      throw e;
    }
  });

  return app;
}

export function createTestApp(): {
  app: ReturnType<typeof createApp>;
  catalog: MemoryCatalogRepository;
  adjustments: MemoryAdjustmentRepository;
  shops: MemoryShopRepository;
  competitors: MemoryCompetitorRepository;
  repricing: MemoryRepricingRepository;
  dynamicRules: MemoryDynamicRuleRepository;
  listingHealth: MemoryListingHealthRepository;
  repricingActivity: MemoryRepricingActivityRepository;
  publishAdapter: MockChannelPublishAdapter;
  listingAdapter: MockChannelListingAdapter;
  reconciliationAlerts: MemoryReconciliationAlertRepository;
  agentAudit: MemoryAgentToolAuditRepository;
} {
  const catalog = new MemoryCatalogRepository();
  const adjustments = new MemoryAdjustmentRepository();
  const shopsRepo = new MemoryShopRepository();
  const competitorsRepo = new MemoryCompetitorRepository();
  const repricingRepo = new MemoryRepricingRepository();
  const dynamicRulesRepo = new MemoryDynamicRuleRepository();
  const listingHealthRepo = new MemoryListingHealthRepository();
  const repricingActivityRepo = new MemoryRepricingActivityRepository();
  const publishAdapter = new MockChannelPublishAdapter();
  const listingAdapter = new MockChannelListingAdapter();
  const reconciliationAlertsRepo = new MemoryReconciliationAlertRepository();
  const agentAuditRepo = new MemoryAgentToolAuditRepository();
  return {
    app: createApp({
      catalog,
      adjustments,
      shops: shopsRepo,
      competitors: competitorsRepo,
      repricing: repricingRepo,
      dynamicRules: dynamicRulesRepo,
      listingHealth: listingHealthRepo,
      repricingActivity: repricingActivityRepo,
      publishAdapter,
      listingAdapter,
      reconciliationAlerts: reconciliationAlertsRepo,
      agentAudit: agentAuditRepo,
    }),
    catalog,
    adjustments,
    shops: shopsRepo,
    competitors: competitorsRepo,
    repricing: repricingRepo,
    dynamicRules: dynamicRulesRepo,
    listingHealth: listingHealthRepo,
    repricingActivity: repricingActivityRepo,
    publishAdapter,
    listingAdapter,
    reconciliationAlerts: reconciliationAlertsRepo,
    agentAudit: agentAuditRepo,
  };
}

export function createPublicApp() {
  const app = new Hono();
  app.get("/health", (c) =>
    c.json({ status: "ok", service: "mx-pricing-bff" })
  );
  return app;
}
