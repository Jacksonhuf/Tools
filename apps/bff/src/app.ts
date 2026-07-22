import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { parseAcceptLanguage, formatMoney, type AppLocale } from "@mx-pricing/i18n-format";
import {
  checkMinMargin,
  type GuardCode,
} from "@mx-pricing/pricing-engine";
import { buildPricingContext, runSimulate } from "./pricing-service.js";
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
import { tierIntervalMs } from "./repricing/tier.js";
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
} from "./repricing-queue-service.js";
import {
  planRepricingShards,
  runRepricingBatchShard,
  runRepricingBatchAllShards,
  runRepricingBatchForTenant,
} from "./repricing-batch-shard.js";
import {
  enqueueRepricingBatchJob,
  getRepricingBatchJob,
  listRepricingBatchJobs,
  processRepricingBatchQueue,
} from "./repricing-batch-job-queue.js";
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
import { buildOpsMetricsSnapshot } from "./ops-metrics.js";
import { recordPricingSimulate } from "./pricing-nfr-metrics.js";
import {
  applyCategoryDefaults,
  getCategoryRuleTemplate,
  listCategoryRuleTemplates,
} from "./category-rule-template.js";
import { listSharedFeeTemplates } from "./tenant-fee-template-share.js";
import { applySharedFeeTemplateToSku } from "./shared-fee-template-apply.js";
import { getCrossChannelGuardForSku } from "./cross-channel-guard.js";
import { buildCrossChannelDashboard } from "./cross-channel-dashboard.js";
import {
  applyLandedCostImport,
  parseLandedCostCsv,
} from "./landed-cost-import.js";
import { buildVersionBackupSnapshot } from "./version-backup-service.js";
import { validateVersionBackupSnapshot } from "./version-backup-validate.js";
import {
  createStoredExport,
  getStoredExport,
} from "./export-file-store.js";
import { listFxRates, upsertFxRate } from "./fx-rate-table.js";
import { computeLandedFromFx } from "./landed-cost-fx.js";
import { getAdjustmentApprovalPolicy } from "./adjustment-approval-policy.js";
import {
  getAsyncWorkerStatus,
  recordWorkerHeartbeat,
} from "./worker-heartbeat.js";
import {
  buildPricingSnapshotRows,
  pricingSnapshotToCsv,
} from "./pricing-report-service.js";
import {
  getChannelSandboxStatus,
  isChannelSandboxEnabled,
  listChannelSandboxEvents,
  recordChannelSandboxEvent,
} from "./channel-sandbox-ledger.js";
import {
  invokeAgentTool,
  listAgentTools,
} from "./agent-tools.js";
import {
  compileRuleViaAdapter,
  getRuleCompilerStatus,
} from "./rule-compiler-adapter.js";
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
import {
  buildPricingContextNarrative,
  copilotWelcomeMessage,
} from "./copilot-narrative.js";
import { buildDailyAgentDigest } from "./agent-digest-service.js";
import {
  dispatchDailyDigest,
  getDigestSchedule,
  listDigestDispatches,
  resetDigestDispatchForTests,
  upsertDigestSchedule,
} from "./agent-digest-dispatch.js";
import {
  enqueueDailyDigestJob,
  listDigestQueuedJobs,
  listDigestDeadLetterJobs,
  processDigestQueue,
  resetDigestJobQueueForTests,
} from "./digest-job-queue.js";
import { evaluateAgentReadiness } from "./agent-readiness.js";
import {
  getProductMilestoneStatus,
  getProductReadinessSummary,
} from "./agent-milestones.js";
import {
  type AgentToolAuditRepository,
  getAgentToolAuditRepository,
  MemoryAgentToolAuditRepository,
} from "./repositories/agent-audit-index.js";
import { getAuthStatus, validateBearerTokenAsync } from "./auth.js";
import { getFeatureFlags } from "./feature-flags.js";
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

  app.get("/api/v1/feature-flags", (c) => c.json(getFeatureFlags()));

  app.get("/api/v1/skus/:skuId/pricing-context", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const channel = c.req.query("channel") as
      | "MERCADO_LIBRE"
      | "AMAZON_MX"
      | undefined;
    const versions = await catalog.listVersions(sku.id);
    const active = versions.find(
      (v) => v.state === "active" && v.channel === (channel ?? "MERCADO_LIBRE")
    );
    const ctx = buildPricingContext(sku, channel, c.get("locale"));
    if (active) {
      const locale = c.get("locale");
      ctx.versions.active = {
        version_id: active.id,
        publish_price_mxn: active.publish_price_mxn,
        publish_price: formatMoney({
          locale,
          currency: "MXN",
          amount: active.publish_price_mxn,
        }),
        channel: active.channel as "MERCADO_LIBRE" | "AMAZON_MX",
      };
    }
    const ch = channel ?? "MERCADO_LIBRE";
    const listingId = getListingIdForChannel(ch);
    if (listingId) {
      const withLatest = await mapOffersWithLatestObservations(
        competitors,
        listingId
      );
      Object.assign(ctx, {
        competitors: {
          offers: withLatest,
          anchor: buildCompetitorAnchorSummary(withLatest),
        },
      });
    }
    return c.json(ctx);
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

  app.get("/api/v1/cross-channel/dashboard", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(await buildCrossChannelDashboard(catalog, tenantId));
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

  app.get("/api/v1/adjustment-batches/approval-policy", async (c) => {
    return c.json(getAdjustmentApprovalPolicy());
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

  app.get("/api/v1/channels/sandbox/status", async (c) => {
    return c.json(getChannelSandboxStatus());
  });

  app.get("/api/v1/channels/adapters/status", async (c) => {
    return c.json(getChannelAdapterStatus());
  });

  app.get("/api/v1/ops/metrics", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(await buildOpsMetricsSnapshot(catalog, tenantId));
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
    const body = (await c.req.json()) as { kind?: string };
    const kind = body.kind ?? "version_backup";
    let content = "";
    let content_type = "application/json";
    if (kind === "version_backup") {
      const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
      content = JSON.stringify(snapshot, null, 2);
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

  app.get("/api/v1/channels/sandbox/events", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 30;
    return c.json({ items: listChannelSandboxEvents(tenantId, limit) });
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

  app.get("/api/v1/listings/:listingId/ingest/status", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const schedule = await ensureIngestSchedule(repricing, listingId);
    return c.json({
      listing_id: listingId,
      tier: schedule.tier,
      next_run_at: schedule.next_run_at,
      interval_ms: tierIntervalMs(schedule.tier),
      ...(await listingHealth.getIngestGuard(listingId)),
    });
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

  app.get("/api/v1/listings/:listingId/dynamic-repricing-rule", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    let rule = await dynamicRules.getRule(listingId);
    if (!rule) {
      rule = await dynamicRules.upsertRule(listingId, {});
    }
    const sku = await catalog.getSku(tenantId, listing.sku.id);
    const categoryId = sku?.category_id;
    const template = categoryId
      ? getCategoryRuleTemplate(tenantId, categoryId)
      : undefined;
    const effective = applyCategoryDefaults(rule, template);
    const stale = await listingHealth.getStale(listingId);
    return c.json({ rule: effective, stale, category_template: template ?? null });
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

  app.post("/api/v1/repricing-queue/promote-pending", async (c) => {
    const body = (await c.req.json()) as { version_ids?: string[] };
    if (!body.version_ids?.length) {
      throw new HTTPException(400, { message: "INVALID_VERSION_IDS" });
    }
    const result = await promoteVersionsToPending(catalog, body.version_ids);
    return c.json(result);
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

  app.get("/api/v1/repricing-batch/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: await listRepricingBatchJobs(tenantId, limit) });
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

  app.get("/api/v1/category-rule-templates/:categoryId", async (c) => {
    const tenantId = c.get("tenantId");
    const tpl = getCategoryRuleTemplate(tenantId, c.req.param("categoryId"));
    if (!tpl) {
      throw new HTTPException(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
    }
    return c.json(tpl);
  });

  app.get("/api/v1/tenants/:tenantId/shared-fee-templates", async (c) => {
    const tenantId = c.req.param("tenantId");
    const headerTenant = c.get("tenantId");
    if (tenantId !== headerTenant) {
      throw new HTTPException(403, { message: "TENANT_MISMATCH" });
    }
    return c.json({ items: listSharedFeeTemplates(tenantId) });
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

  app.get("/api/v1/reconciliation-alerts", async (c) => {
    const tenantId = c.get("tenantId");
    const items = await reconciliationAlerts.listAlerts(tenantId);
    return c.json({ items });
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

  app.get("/api/v1/agent/tools", async (c) => {
    return c.json({ items: listAgentTools() });
  });

  app.get("/api/v1/agent/readiness", async (c) => {
    return c.json(evaluateAgentReadiness());
  });

  app.get("/api/v1/agent/milestones", async (c) => {
    return c.json(getProductMilestoneStatus());
  });

  app.get("/api/v1/product/readiness", async (c) => {
    return c.json(getProductReadinessSummary());
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
    const schedule = upsertDigestSchedule(tenantId, body);
    return c.json(schedule);
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

  app.get("/api/v1/agent/digest/dispatches", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: listDigestDispatches(tenantId, limit) });
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

  app.get("/api/v1/agent/digest/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: listDigestQueuedJobs(tenantId, limit) });
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

  app.get("/api/v1/agent/tool-audit", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 100;
    const items = await agentAudit.listInvocations(tenantId, limit);
    return c.json({ items });
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
