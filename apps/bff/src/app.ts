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
import { buildCompetitorAnchorSummary } from "./competitor-summary.js";
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
import { publishListingPrice } from "./channel-publish-service.js";
import {
  type RepricingActivityRepository,
  getRepricingActivityRepository,
  MemoryRepricingActivityRepository,
} from "./repositories/repricing-activity-index.js";

export type AppEnv = {
  Variables: {
    tenantId: string;
    locale: AppLocale;
  };
};

const DEV_TOKEN = "dev-token";

export interface CreateAppOptions {
  catalog?: CatalogRepository;
  adjustments?: AdjustmentRepository;
  shops?: ShopRepository;
  competitors?: CompetitorRepository;
  repricing?: RepricingRepository;
  dynamicRules?: DynamicRuleRepository;
  listingHealth?: ListingHealthRepository;
  repricingActivity?: RepricingActivityRepository;
  publishAdapter?: MockChannelPublishAdapter;
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
  const listingAdapter = new MockChannelListingAdapter();
  const publishAdapter =
    options.publishAdapter ?? new MockChannelPublishAdapter();
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
    if (token !== DEV_TOKEN) {
      throw new HTTPException(401, { message: "INVALID_TOKEN" });
    }
    const tenantId = c.req.header("X-Tenant-Id") ?? "tenant-demo";
    c.set("tenantId", tenantId);
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
      const offers = await competitors.listOffers(listingId);
      const withLatest = await Promise.all(
        offers.map(async (o) => {
          const latest = await competitors.latestObservation(o.id);
          return {
            ...o,
            latest_effective_mxn: latest?.effective_price ?? null,
          };
        })
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
    const result = runSimulate(sku, body, c.get("locale"));
    return c.json(result);
  });

  app.get("/api/v1/adjustment-batches", async (c) => {
    const items = await adjustments.listBatches(c.get("tenantId"));
    return c.json({ items });
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
      return c.json(batch, 201);
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
    return c.json({ shop_id: shopId, snapshot });
  });

  app.get("/api/v1/listings/:listingId/competitors", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException(404, { message: "LISTING_NOT_FOUND" });
    }
    const offers = await competitors.listOffers(listingId);
    const withLatest = await Promise.all(
      offers.map(async (o) => {
        const latest = await competitors.latestObservation(o.id);
        return {
          ...o,
          latest_effective_mxn: latest?.effective_price ?? null,
          latest_observed_at: latest?.observed_at ?? null,
        };
      })
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
      raw_json: body.source ? { source: body.source } : undefined,
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
        tenantId,
        listingId
      );
      return c.json(result);
    } catch (e) {
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
    const stale = await listingHealth.getStale(listingId);
    return c.json({ rule, stale });
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
        | "auto_active"
        | undefined,
      anchor_type: body.anchor_type as string | undefined,
      offset: body.offset as { type: "PERCENT" | "FIXED_MXN"; value: number },
      cooldown_min: body.cooldown_min as number | undefined,
      daily_limit: body.daily_limit as number | undefined,
      min_gap_mxn: body.min_gap_mxn as number | undefined,
      frozen: body.frozen as boolean | undefined,
    });
    return c.json(rule);
  });

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
    };
    try {
      const result = await publishListingPrice(
        catalog,
        shops,
        dynamicRules,
        publishAdapter,
        tenantId,
        listingId,
        body
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
  };
}

export function createPublicApp() {
  const app = new Hono();
  app.get("/health", (c) =>
    c.json({ status: "ok", service: "mx-pricing-bff" })
  );
  return app;
}
