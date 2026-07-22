import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("price history CSV (Loop 118)", () => {
  it("GET /listings/:id/price-history/export", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/price-history/export?range=7d",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("observation_id");
    expect(text).toContain("listing_id");
  });
});

describe("repricing events CSV (Loop 119)", () => {
  it("GET /listings/:id/repricing-events/export after flush", async () => {
    const { app } = createTestApp();
    await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({}) }
    );
    const res = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/export",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("event_id");
    expect(text).toContain("listing_id");
  });
});

describe("adjustment batches index CSV (Loop 120)", () => {
  it("GET /adjustment-batches/export", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/adjustment-batches", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason_code: "loop118",
        items: [{ listing_id: "listing-ml-001", explicit_price_mxn: 1588 }],
      }),
    });
    const res = await app.request("/api/v1/adjustment-batches/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("batch_id");
  });
});

describe("export store kinds (Loop 118-120)", () => {
  it("POST /exports price_history_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "price_history_csv",
        listing_id: "listing-ml-001",
      }),
    });
    expect(post.status).toBe(200);
  });
});
