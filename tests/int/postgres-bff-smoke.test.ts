import { describe, expect, it, beforeAll } from "vitest";
import { runMigrations, seedDemoData } from "@mx-pricing/db";
import { createApp } from "../../apps/bff/src/app.js";
import { PostgresCatalogRepository } from "../../apps/bff/src/repositories/postgres-catalog.js";
import { PostgresShopRepository } from "../../apps/bff/src/repositories/postgres-shop.js";
import { PostgresAdjustmentRepository } from "../../apps/bff/src/repositories/postgres-adjustment.js";
import { PostgresCompetitorRepository } from "../../apps/bff/src/repositories/postgres-competitor.js";
import { PostgresRepricingRepository } from "../../apps/bff/src/repositories/postgres-repricing.js";

const DATABASE_URL = process.env.DATABASE_URL;
const RUN_PG =
  process.env.RUN_PG_INTEGRATION === "1" || process.env.RUN_PG_INTEGRATION === "true";
const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = {
  ...AUTH,
  ...TENANT,
  "Content-Type": "application/json",
};

/**
 * TC-INT-PG-001 — BFF reads catalog + persists versions when DATABASE_URL is set.
 * TC-INT-PG-002/003 — shop OAuth + adjustment batches on PostgreSQL.
 * TC-INT-PG-004/005 — competitor + repricing events on PostgreSQL.
 * CI: `.github/workflows/ci-postgres-int.yml`
 */
describe.skipIf(!RUN_PG || !DATABASE_URL)("TC-INT-PG BFF postgres path", () => {
  let catalog: PostgresCatalogRepository;
  let shops: PostgresShopRepository;
  let adjustments: PostgresAdjustmentRepository;
  let competitors: PostgresCompetitorRepository;
  let repricing: PostgresRepricingRepository;

  beforeAll(async () => {
    await runMigrations(DATABASE_URL!);
    await seedDemoData(DATABASE_URL!);
    catalog = new PostgresCatalogRepository(DATABASE_URL!);
    shops = new PostgresShopRepository(DATABASE_URL!);
    adjustments = new PostgresAdjustmentRepository(DATABASE_URL!);
    competitors = new PostgresCompetitorRepository(DATABASE_URL!);
    repricing = new PostgresRepricingRepository(DATABASE_URL!);
  });

  it("GET pricing-context loads SKU from PostgreSQL", async () => {
    const app = createApp({ catalog });
    const res = await app.request("/api/v1/skus/demo-sku-001/pricing-context", {
      headers: { ...AUTH, ...TENANT, "Accept-Language": "en" },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { sku_id: string; channels: unknown[] };
    expect(json.sku_id).toBe("demo-sku-001");
    expect(json.channels.length).toBeGreaterThanOrEqual(2);
  });

  it("POST price-version persists active version in PostgreSQL", async () => {
    const app = createApp({ catalog });
    const post = await app.request(
      "/api/v1/listings/listing-ml-001/price-versions",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ explicit_price_mxn: 1755 }),
      }
    );
    expect(post.status).toBe(200);
    const versions = await catalog.listVersions("demo-sku-001");
    const activeMl = versions.filter(
      (v) => v.channel === "MERCADO_LIBRE" && v.state === "active"
    );
    expect(activeMl.length).toBe(1);
    expect(activeMl[0]?.publish_price_mxn).toBe(1755);
  });

  it("TC-INT-PG-002 mock OAuth persists connected shop in PostgreSQL", async () => {
    const app = createApp({ catalog, shops });
    const res = await app.request(
      "/api/v1/shops/shop-ml-demo/oauth/mock-complete",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
      }
    );
    expect(res.status).toBe(200);
    const shop = await shops.getShop("tenant-demo", "shop-ml-demo");
    expect(shop?.auth_status).toBe("connected");
    expect(shop?.external_seller_id).toBeTruthy();
    const token = await shops.getAccessToken("shop-ml-demo");
    expect(token).toBeTruthy();
  });

  it("TC-INT-PG-003 adjustment batch create and approve in PostgreSQL", async () => {
    const app = createApp({ catalog, adjustments });
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 2000 }),
    });
    const create = await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason_code: "pg-int-test",
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1850 }],
      }),
    });
    expect(create.status).toBe(201);
    const batch = (await create.json()) as { id: string; status: string };
    expect(batch.status).toBe("pending_approval");

    const approve = await app.request(
      `/api/v1/adjustment-batches/${batch.id}/approve`,
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(approve.status).toBe(200);
    const approved = (await approve.json()) as { status: string };
    expect(approved.status).toBe("approved");

    const stored = await adjustments.getBatch("tenant-demo", batch.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.reason_code).toBe("pg-int-test");
  });

  it("TC-INT-PG-004 competitor offer and observation persist in PostgreSQL", async () => {
    const app = createApp({ catalog, competitors });
    const offerRes = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          external_ref: "MLM-PG-INT",
          label: "PG rival",
          is_primary: true,
        }),
      }
    );
    expect(offerRes.status).toBe(201);
    const offer = (await offerRes.json()) as { id: string };
    const obsRes = await app.request(
      `/api/v1/competitor-offers/${offer.id}/observations`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sale_price: 1499, include_shipping: false }),
      }
    );
    expect(obsRes.status).toBe(201);
    const offers = await competitors.listOffers("listing-ml-001");
    expect(offers.some((o) => o.id === offer.id)).toBe(true);
    const latest = await competitors.latestObservation(offer.id);
    expect(latest?.effective_price).toBe(1499);
  });

  it("TC-INT-PG-005 repricing event enqueued after observation flush", async () => {
    const app = createApp({ catalog, competitors, repricing });
    const offerRes = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-PG-REPRICE", label: "Flush test" }),
      }
    );
    const offer = (await offerRes.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1510 }),
    });
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(flush.status).toBe(200);
    const events = await repricing.listEvents("tenant-demo", "listing-ml-001");
    expect(
      events.some((e) => e.type === "CompetitorPriceChanged")
    ).toBe(true);
  });
});
