import { describe, expect, it } from "vitest";
import { digestDispatchesToCsv } from "../../apps/bff/src/digest-dispatches-csv.js";
import { channelSandboxEventsToCsv } from "../../apps/bff/src/channel-sandbox-csv.js";
import { agentToolAuditToCsv } from "../../apps/bff/src/agent-audit-csv.js";

describe("single-row CSV helpers (Loop 186-189)", () => {
  it("digestDispatchesToCsv includes job_id", () => {
    const csv = digestDispatchesToCsv(
      [
        {
          job_id: "digest-job-1",
          tenant_id: "tenant-demo",
          date: "2026-07-22",
          status: "completed",
          created_at: "2026-07-22T00:00:00.000Z",
          deliveries: [
            { channel: "email_stub", status: "sent_stub", to: "a@b.c" },
          ],
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("digest-job-1");
  });

  it("channelSandboxEventsToCsv includes event id", () => {
    const csv = channelSandboxEventsToCsv(
      [
        {
          id: "sandbox-1",
          tenant_id: "tenant-demo",
          listing_id: "listing-ml-001",
          channel: "MERCADO_LIBRE",
          event_type: "channel_publish",
          payload: { ok: true },
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("sandbox-1");
  });

  it("agentToolAuditToCsv includes audit id", () => {
    const csv = agentToolAuditToCsv(
      [
        {
          id: "audit-1",
          tenant_id: "tenant-demo",
          tool_name: "tool_pricing_context",
          session_id: null,
          arguments_json: {},
          result_summary: "ok",
          created_at: "2026-07-22T00:00:00.000Z",
        },
      ],
      "2026-07-22T12:00:00.000Z"
    );
    expect(csv).toContain("tool_pricing_context");
  });
});
