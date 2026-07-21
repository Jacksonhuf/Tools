import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  resetDigestDispatchForTests,
} from "../../apps/bff/src/agent-digest-dispatch.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("digest job queue", () => {
  const prevWebhook = process.env.DIGEST_WEBHOOK_URL;

  beforeEach(() => {
    resetDigestDispatchForTests();
    resetDigestJobQueueForTests();
    const t = createTestApp();
    t.agentAudit.resetForTests?.();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevWebhook === undefined) delete process.env.DIGEST_WEBHOOK_URL;
    else process.env.DIGEST_WEBHOOK_URL = prevWebhook;
  });

  it("enqueue then process completes job", async () => {
    const { app } = createTestApp();
    const enq = await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({ channels: ["email_stub"] }),
    });
    expect(enq.status).toBe(200);
    const { job } = (await enq.json()) as {
      job: { job_id: string; status: string };
    };
    expect(job.status).toBe("queued");

    const proc = await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    expect(proc.status).toBe(200);
    const out = (await proc.json()) as {
      processed: Array<{ status: string; result: { digest: { narrative: string } } | null }>;
    };
    expect(out.processed[0].status).toBe("completed");
    expect(out.processed[0].result?.digest.narrative).toBeTruthy();
  });

  it("webhook_queue accepts when DIGEST_WEBHOOK_URL set", async () => {
    process.env.DIGEST_WEBHOOK_URL = "https://hooks.example/digest";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 }))
    );
    const { app } = createTestApp();
    await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ channels: ["webhook_queue"] }),
    });
    const proc = await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    const out = (await proc.json()) as {
      processed: Array<{
        result: { deliveries: Array<{ status: string }> } | null;
      }>;
    };
    expect(out.processed[0].result?.deliveries[0].status).toBe(
      "webhook_accepted"
    );
  });
});
