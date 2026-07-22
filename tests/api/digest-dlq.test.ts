import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-NFR-REL-004 digest poison → dead letter", () => {
  beforeEach(() => {
    resetDigestJobQueueForTests();
    process.env.DIGEST_MAX_ATTEMPTS = "2";
  });

  it("moves poison job to dead-letter after max attempts", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ simulate_poison: true, channels: ["email_stub"] }),
    });
    expect(enq.status).toBe(200);

    await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });

    const dlq = await app.request("/api/v1/agent/digest/jobs/dead-letter", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(dlq.status).toBe(200);
    const json = (await dlq.json()) as {
      items: Array<{ status: string; attempts: number }>;
    };
    expect(json.items.length).toBeGreaterThanOrEqual(1);
    expect(json.items[0]?.status).toBe("dead_letter");
    expect(json.items[0]?.attempts).toBeGreaterThanOrEqual(2);

    const metrics = await app.request("/api/v1/ops/metrics", {
      headers: { ...AUTH, ...TENANT },
    });
    const ops = (await metrics.json()) as {
      digest_queue: { dead_letter: number };
    };
    expect(ops.digest_queue.dead_letter).toBeGreaterThanOrEqual(1);
  });
});
