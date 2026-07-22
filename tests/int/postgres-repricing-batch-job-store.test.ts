import { describe, expect, it, beforeAll } from "vitest";
import { newDb } from "pg-mem";
import { runMigrations } from "@mx-pricing/db";
import { PostgresRepricingBatchJobStore } from "../../apps/bff/src/repositories/postgres-repricing-batch-job-store.js";

describe("TC-INT-REPR-BATCH-PG postgres repricing batch job store", () => {
  let store: PostgresRepricingBatchJobStore;

  beforeAll(async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    const client = await pool.connect();
    await runMigrations("pg-mem", client);
    client.release();
    store = new PostgresRepricingBatchJobStore(pool);
  });

  it("persists enqueue and process lifecycle", async () => {
    const job = await store.enqueue({
      tenant_id: "tenant-demo",
      scope: "tenant",
      shard_total: 2,
    });
    expect(job.status).toBe("queued");

    const claimed = await store.claimQueued("tenant-demo", 1);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].job_id).toBe(job.job_id);
    expect(claimed[0].status).toBe("processing");

    const done = { ...claimed[0], status: "completed" as const, error: null, result: { ok: true } };
    await store.save(done);

    const loaded = await store.get("tenant-demo", job.job_id);
    expect(loaded?.status).toBe("completed");
    const summary = await store.summary("tenant-demo");
    expect(summary.total).toBe(1);
    expect(summary.queued).toBe(0);
  });
});
