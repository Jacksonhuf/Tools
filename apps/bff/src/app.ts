import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { parseAcceptLanguage, type AppLocale } from "@mx-pricing/i18n-format";
import { getSku } from "./fixtures.js";
import { buildPricingContext, runSimulate } from "./pricing-service.js";

export type AppEnv = {
  Variables: {
    tenantId: string;
    locale: AppLocale;
  };
};

const DEV_TOKEN = "dev-token";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
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
    const ctx = buildPricingContext(sku, channel, c.get("locale"));
    return c.json(ctx);
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
