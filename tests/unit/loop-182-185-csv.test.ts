import { describe, expect, it } from "vitest";
import { digestQueuedJobsToCsv } from "../../apps/bff/src/digest-queued-jobs-csv.js";

describe("digestQueuedJobsToCsv single job", () => {
  it("includes job_id", () => {
    const csv = digestQueuedJobsToCsv(
      [
        {
          job_id: "digest-q-1",
          tenant_id: "tenant-demo",
          locale: "en",
          date: null,
          channels: ["email_stub"],
          status: "queued",
          attempts: 0,
          created_at: "2026-07-22T00:00:00.000Z",
          updated_at: "2026-07-22T00:00:00.000Z",
          error: null,
          result: null,
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("digest-q-1");
  });
});
