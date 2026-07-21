import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  planRepricingShards,
  repricingShardIndex,
} from "../../apps/bff/src/repricing-batch-shard.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

function resetRepricingFixtures() {
  resetDebounceForTests();
  const t = createTestApp();
  t.competitors.resetForTests?.();
  t.repricing.resetForTests?.();
  t.dynamicRules.resetForTests?.();
  t.listingHealth.resetForTests?.();
  t.repricingActivity.resetForTests?.();
  t.catalog.resetForTests?.();
}

describe("TC-API-REPR-BATCH-001 shard plan", () => {
  it("assigns demo SKU listings deterministically across shards", () => {
    const plan = planRepricingShards("tenant-demo", "demo-sku-001", 4);
    expect(plan.shard_total).toBe(4);
    const allIds = plan.shards.flatMap((s) => s.listing_ids);
    expect(allIds.sort()).toEqual(["listing-amz-001", "listing-ml-001"]);
    for (const id of allIds) {
      const idx = repricingShardIndex(id, 4);
      const bucket = plan.shards.find((s) => s.shard_index === idx);
      expect(bucket?.listing_ids).toContain(id);
    }
  });

  it("GET shard-plan returns 404 for unknown SKU", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/missing-sku/repricing-batch/shard-plan?shard_total=2",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(404);
  });

  it("GET shard-plan validates shard_total", async () => {
    const { app } = createTestApp();
    const bad = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/shard-plan?shard_total=0",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(bad.status).toBe(400);
    const ok = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/shard-plan?shard_total=2",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as {
      shards: Array<{ listing_ids: string[] }>;
    };
    expect(body.shards).toHaveLength(2);
  });
});

describe("TC-API-REPR-BATCH-002 batch recompute shard", () => {
  beforeEach(() => {
    resetRepricingFixtures();
  });

  async function seedOffer(app: ReturnType<typeof createTestApp>["app"]) {
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-SHARD" }),
      }
    );
    return (await create.json()) as { id: string };
  }

  it("processes pending events only for listings in the requested shard", async () => {
    const { app } = createTestApp();
    const offer = await seedOffer(app);
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        sale_price: 1350,
        observed_at: "2026-07-21T12:00:00.000Z",
      }),
    });
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(flush.status).toBe(200);

    const plan = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/shard-plan?shard_total=8",
      { headers: { ...AUTH, ...TENANT } }
    );
    const planBody = (await plan.json()) as {
      shards: Array<{ shard_index: number; listing_ids: string[] }>;
    };
    const mlShard = planBody.shards.find((s) =>
      s.listing_ids.includes("listing-ml-001")
    );
    expect(mlShard).toBeDefined();

    const recompute = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/recompute",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          shard_index: mlShard!.shard_index,
          shard_total: 8,
        }),
      }
    );
    expect(recompute.status).toBe(200);
    const result = (await recompute.json()) as {
      processed: Array<{ listing_id: string; result: string }>;
      skipped: Array<{ listing_id: string; reason: string }>;
    };
    const mlProcessed = result.processed.filter(
      (p) => p.listing_id === "listing-ml-001"
    );
    expect(mlProcessed.length).toBeGreaterThanOrEqual(1);
    expect(mlProcessed[0].result).not.toMatch(/^skipped:/);

    const otherShard =
      planBody.shards.find((s) => s.shard_index !== mlShard!.shard_index) ??
      planBody.shards[0];
    const emptyRun = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/recompute",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          shard_index: otherShard.shard_index,
          shard_total: 8,
        }),
      }
    );
    const emptyBody = (await emptyRun.json()) as {
      processed: unknown[];
      skipped: Array<{ listing_id: string; reason: string }>;
    };
    expect(
      emptyBody.processed.every(
        (p) =>
          (p as { listing_id: string }).listing_id !== "listing-ml-001"
      )
    ).toBe(true);
  });
});

describe("TC-API-REPR-BATCH-003 orchestrated recompute-all", () => {
  beforeEach(() => {
    resetRepricingFixtures();
  });

  it("runs all shards for demo SKU via recompute-all", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-batch/recompute-all",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ shard_total: 4 }),
      }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      shard_total: number;
      shards: unknown[];
      totals: { processed: number; skipped: number };
    };
    expect(body.shard_total).toBe(4);
    expect(body.shards).toHaveLength(4);
    expect(body.totals.skipped).toBeGreaterThanOrEqual(2);
  });

  it("tenant recompute-all includes demo SKU", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/repricing-batch/recompute-all", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ shard_total: 2 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      skus: Array<{ sku_id: string }>;
      totals: { processed: number; skipped: number };
    };
    expect(body.skus.some((s) => s.sku_id === "demo-sku-001")).toBe(true);
  });
});
