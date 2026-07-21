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
import { MockChannelListingAdapter } from "@mx-pricing/channel-adapters";
import {
  type ShopRepository,
  getShopRepository,
  MemoryShopRepository,
} from "./repositories/shop-index.js";

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
}

export function createApp(options: CreateAppOptions = {}) {
  const catalog = options.catalog ?? getCatalogRepository();
  const adjustments = options.adjustments ?? getAdjustmentRepository();
  const shops = options.shops ?? getShopRepository();
  const listingAdapter = new MockChannelListingAdapter();
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

  return app;
}

export function createTestApp(): {
  app: ReturnType<typeof createApp>;
  catalog: MemoryCatalogRepository;
  adjustments: MemoryAdjustmentRepository;
  shops: MemoryShopRepository;
} {
  const catalog = new MemoryCatalogRepository();
  const adjustments = new MemoryAdjustmentRepository();
  const shopsRepo = new MemoryShopRepository();
  return {
    app: createApp({ catalog, adjustments, shops: shopsRepo }),
    catalog,
    adjustments,
    shops: shopsRepo,
  };
}

export function createPublicApp() {
  const app = new Hono();
  app.get("/health", (c) =>
    c.json({ status: "ok", service: "mx-pricing-bff" })
  );
  return app;
}
