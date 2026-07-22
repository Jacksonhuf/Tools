import { describe, expect, it } from "vitest";
import { repricingQueueToCsv } from "../../apps/bff/src/repricing-queue-csv.js";
import { digestDispatchesToCsv } from "../../apps/bff/src/digest-dispatches-csv.js";
import { workerHeartbeatsToCsv } from "../../apps/bff/src/worker-heartbeats-csv.js";

describe("repricingQueueToCsv", () => {
  it("includes version_id", () => {
    const csv = repricingQueueToCsv(
      [
        {
          sku_id: "demo-sku-001",
          version_id: "ver-1",
          listing_id: "listing-ml-001",
          channel: "MERCADO_LIBRE",
          state: "pending",
          publish_price_mxn: 1600,
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("ver-1");
  });
});

describe("digestDispatchesToCsv", () => {
  it("includes job_id", () => {
    const csv = digestDispatchesToCsv(
      [
        {
          job_id: "digest-job-1",
          tenant_id: "tenant-demo",
          date: "2026-07-22",
          status: "completed",
          created_at: "2026-07-22T00:00:00.000Z",
          deliveries: [{ channel: "email_stub", status: "sent_stub" }],
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("digest-job-1");
  });
});

describe("workerHeartbeatsToCsv", () => {
  it("includes worker_id", () => {
    const csv = workerHeartbeatsToCsv(
      [
        {
          worker_id: "w-1",
          reported_at: "2026-07-22T00:00:00.000Z",
          stale: false,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("w-1");
  });
});
