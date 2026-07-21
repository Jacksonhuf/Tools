import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-E2E-OPS-002 batch promote suggested to pending", () => {
  it("lists suggested queue and promotes selected versions", async () => {
    const { app, catalog } = createTestApp();
    catalog.resetForTests?.();
    const ml = await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "MERCADO_LIBRE",
      state: "suggested",
      publish_price_mxn: 1580,
    });
    const amz = await catalog.createVersion({
      tenant_id: "tenant-demo",
      sku_id: "demo-sku-001",
      channel: "AMAZON_MX",
      state: "suggested",
      publish_price_mxn: 1575,
    });
    const list = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-queue",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(list.status).toBe(200);
    const queue = (await list.json()) as {
      items: Array<{ version_id: string; state: string }>;
    };
    expect(queue.items).toHaveLength(2);
    expect(queue.items.every((i) => i.state === "suggested")).toBe(true);

    const promote = await app.request(
      "/api/v1/repricing-queue/promote-pending",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ version_ids: [ml.id, amz.id] }),
      }
    );
    expect(promote.status).toBe(200);
    const promoted = (await promote.json()) as {
      updated: Array<{ version_id: string; state: string }>;
      skipped: string[];
    };
    expect(promoted.skipped).toHaveLength(0);
    expect(promoted.updated).toHaveLength(2);
    expect(promoted.updated.every((i) => i.state === "pending")).toBe(true);

    const after = await app.request(
      "/api/v1/skus/demo-sku-001/repricing-queue",
      { headers: { ...AUTH, ...TENANT } }
    );
    const queueAfter = (await after.json()) as {
      items: Array<{ state: string }>;
    };
    expect(queueAfter.items).toHaveLength(2);
    expect(queueAfter.items.every((i) => i.state === "pending")).toBe(true);
  });
});
