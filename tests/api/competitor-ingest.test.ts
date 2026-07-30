import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";
import { parseCompetitorIngestHttpResponse } from "../../apps/bff/src/competitor-ingest-http.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("P2-E2 competitor ingest pipeline", () => {
  const prevDriver = process.env.COMPETITOR_INGEST_DRIVER;
  const prevScrape = process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE;

  beforeEach(() => {
    resetDebounceForTests();
    delete process.env.COMPETITOR_INGEST_DRIVER;
    delete process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE;
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.catalog.resetForTests?.();
    t.listingAdapter.failNextPull = false;
  });

  afterEach(() => {
    if (prevDriver === undefined) delete process.env.COMPETITOR_INGEST_DRIVER;
    else process.env.COMPETITOR_INGEST_DRIVER = prevDriver;
    if (prevScrape === undefined) delete process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE;
    else process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE = prevScrape;
  });

  it("GET /ops/competitor-ingest/status exposes driver", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/ops/competitor-ingest/status", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { driver: string };
    expect(json.driver).toBe("mock");
  });

  it("blocks SCRAPE: external_ref when compliance flag is off (P2-E2-06)", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/competitors", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "SCRAPE:MLM-999" }),
    });
    const run = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/run",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(run.status).toBe(403);
    const body = (await run.json()) as { error: string };
    expect(body.error).toBe("COMPETITOR_SCRAPE_COMPLIANCE_DISABLED");
  });

  it("allows SCRAPE: refs when FEATURE_COMPETITOR_COMPLIANT_SCRAPE=1", async () => {
    process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE = "1";
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/competitors", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "SCRAPE:MLM-OK" }),
    });
    const run = await app.request(
      "/api/v1/listings/listing-ml-001/ingest/run",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(run.status).toBe(200);
  });

  it("POST /ops/competitor-ingest/run-due processes due listings", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/competitors", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ external_ref: "MLM-DUE" }),
    });
    const res = await app.request("/api/v1/ops/competitor-ingest/run-due", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ force: true }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      runs: Array<{ listing_id: string; observations_created: number }>;
    };
    expect(json.runs.some((r) => r.listing_id === "listing-ml-001")).toBe(true);
  });

  it("parses competitor ingest HTTP response with buy_box_winner", () => {
    const parsed = parseCompetitorIngestHttpResponse({
      sale_price: 1299,
      shipping_addon: 49,
      buy_box_winner: true,
    });
    expect(parsed?.sale_price).toBe(1299);
    expect(parsed?.buy_box_winner).toBe(true);
  });
});
