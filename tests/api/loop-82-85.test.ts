import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetListingSyncScheduleForTests } from "../../apps/bff/src/listing-sync-schedule.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("waterfall_csv export store (Loop 82)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports kind waterfall_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "waterfall_csv",
        channel: "MERCADO_LIBRE",
        pricing_mode: "cost",
        target_margin_pct: 20,
      }),
    });
    expect(post.status).toBe(200);
    const meta = (await post.json()) as { download_path: string };
    const dl = await app.request(meta.download_path, {
      headers: { ...AUTH, ...TENANT },
    });
    const text = await dl.text();
    expect(text).toContain("LANDED");
  });
});

describe("listing sync schedule (Loop 83)", () => {
  beforeEach(() => {
    resetListingSyncScheduleForTests();
  });

  it("PUT then GET /ops/listing-sync/schedule", async () => {
    const { app } = createTestApp();
    const put = await app.request("/api/v1/ops/listing-sync/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ enabled: true, cron_expression: "0 */4 * * *" }),
    });
    expect(put.status).toBe(200);
    const get = await app.request("/api/v1/ops/listing-sync/schedule", {
      headers: { ...AUTH, ...TENANT },
    });
    const json = (await get.json()) as { enabled: boolean; cron_expression: string };
    expect(json.enabled).toBe(true);
    expect(json.cron_expression).toBe("0 */4 * * *");
  });
});

describe("competitor curve API (Loop 84)", () => {
  it("GET /listings/:id/competitors/curve", async () => {
    const { app } = createTestApp();
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          external_ref: "curve-offer-1",
          label: "Curve test",
        }),
      }
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${created.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1400, shipping_addon: 0 }),
    });
    const curve = await app.request(
      "/api/v1/listings/listing-ml-001/competitors/curve?range=7d",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(curve.status).toBe(200);
    const body = (await curve.json()) as { points: unknown[] };
    expect(body.points.length).toBeGreaterThan(0);
  });
});
