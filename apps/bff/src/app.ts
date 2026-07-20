import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { parseAcceptLanguage, formatMoney, type AppLocale } from "@mx-pricing/i18n-format";
import {
  checkMinMargin,
  type GuardCode,
} from "@mx-pricing/pricing-engine";
import { getSku, getListing } from "./fixtures.js";
import { buildPricingContext, runSimulate } from "./pricing-service.js";
import { createVersion, listVersions } from "./version-store.js";

export type AppEnv = {
  Variables: {
    tenantId: string;
    locale: AppLocale;
  };
};

const DEV_TOKEN = "dev-token";

export function createApp() {
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
    c.json({ status: "ok", service: "mx-pricing-bff" })
  );

  app.get("/api/v1/skus/:skuId/pricing-context", (c) => {
    const tenantId = c.get("tenantId");
    const sku = getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const channel = c.req.query("channel") as
      | "MERCADO_LIBRE"
      | "AMAZON_MX"
      | undefined;
    const versions = listVersions(sku.id);
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
    const listing = getListing(tenantId, c.req.param("listingId"));
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
    const version = createVersion({
      sku_id: sku.id,
      channel: listing.channel,
      state: "active",
      publish_price_mxn: body.explicit_price_mxn,
    });
    return c.json({
      version_id: version.id,
      state: version.state,
      publish_price_mxn: version.publish_price_mxn,
      reason: body.reason ?? null,
    });
  });

  app.post("/api/v1/skus/:skuId/pricing/simulate", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    const result = runSimulate(sku, body, c.get("locale"));
    return c.json(result);
  });

  return app;
}

export function createPublicApp() {
  const app = new Hono();
  app.get("/health", (c) =>
    c.json({ status: "ok", service: "mx-pricing-bff" })
  );
  return app;
}
