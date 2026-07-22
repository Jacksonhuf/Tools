import { describe, expect, it } from "vitest";
import { channelSandboxEventsToCsv } from "../../apps/bff/src/channel-sandbox-csv.js";
import { digestDeadLetterJobsToCsv } from "../../apps/bff/src/digest-dead-letter-csv.js";

describe("channelSandboxEventsToCsv", () => {
  it("includes event_type", () => {
    const csv = channelSandboxEventsToCsv(
      [
        {
          id: "sandbox-1",
          tenant_id: "tenant-demo",
          listing_id: "listing-ml-001",
          channel: "MERCADO_LIBRE",
          event_type: "channel_publish",
          payload: { price: 100 },
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("channel_publish");
  });
});

describe("digestDeadLetterJobsToCsv", () => {
  it("includes job_id", () => {
    const csv = digestDeadLetterJobsToCsv(
      [
        {
          job_id: "digest-q-1",
          tenant_id: "tenant-demo",
          locale: "en",
          date: null,
          channels: ["email_stub"],
          status: "dead_letter",
          attempts: 2,
          created_at: "2026-07-22T00:00:00.000Z",
          updated_at: "2026-07-22T00:00:01.000Z",
          error: "poison",
          result: null,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("digest-q-1");
  });
});
