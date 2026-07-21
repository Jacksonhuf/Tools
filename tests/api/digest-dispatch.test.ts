import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDigestDispatchForTests } from "../../apps/bff/src/agent-digest-dispatch.js";
import { resetCopilotSessionsForTests } from "../../apps/bff/src/copilot-session.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("agent digest dispatch", () => {
  beforeEach(() => {
    resetDigestDispatchForTests();
    const t = createTestApp();
    t.agentAudit.resetForTests?.();
  });

  it("PUT schedule and POST dispatch email_stub", async () => {
    const { app } = createTestApp();
    const put = await app.request("/api/v1/agent/digest/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        enabled: true,
        email_to: "pricing@demo.mx",
        cron: "0 9 * * *",
      }),
    });
    expect(put.status).toBe(200);
    const sched = (await put.json()) as { enabled: boolean; email_to: string };
    expect(sched.enabled).toBe(true);
    expect(sched.email_to).toBe("pricing@demo.mx");

    const dispatch = await app.request(
      "/api/v1/agent/digest/daily/dispatch",
      {
        method: "POST",
        headers: { ...JSON_HEADERS, "Accept-Language": "en" },
        body: JSON.stringify({ channels: ["email_stub"] }),
      }
    );
    expect(dispatch.status).toBe(200);
    const body = (await dispatch.json()) as {
      job: {
        job_id: string;
        deliveries: Array<{ channel: string; to: string; body: string }>;
      };
      digest: { narrative: string };
    };
    expect(body.job.job_id).toMatch(/^digest-job-/);
    expect(body.job.deliveries[0].channel).toBe("email_stub");
    expect(body.job.deliveries[0].to).toBe("pricing@demo.mx");
    expect(body.job.deliveries[0].body).toBe(body.digest.narrative);

    const list = await app.request("/api/v1/agent/digest/dispatches?limit=5", {
      headers: { ...AUTH, ...TENANT },
    });
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBeGreaterThan(0);
  });
});

describe("Copilot simulate intent", () => {
  beforeEach(() => {
    resetCopilotSessionsForTests();
    const t = createTestApp();
    t.agentAudit.resetForTests?.();
  });

  it("runs tool_simulate narrative in chat", async () => {
    const { app } = createTestApp();
    const created = await app.request("/api/v1/agent/copilot/sessions", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({
        listing_id: "listing-ml-001",
        sku_id: "demo-sku-001",
        bootstrap_context: false,
      }),
    });
    const { session_id } = (await created.json()) as { session_id: string };

    const turn = await app.request(
      `/api/v1/agent/copilot/sessions/${session_id}/messages`,
      {
        method: "POST",
        headers: { ...JSON_HEADERS, "Accept-Language": "en" },
        body: JSON.stringify({
          listing_id: "listing-ml-001",
          content: "Simulate competitor price 250 MXN",
        }),
      }
    );
    expect(turn.status).toBe(200);
    const json = (await turn.json()) as {
      intent: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(json.intent).toBe("simulate");
    expect(
      json.messages.some((m) => m.content.includes("tool_simulate"))
    ).toBe(true);

    const audit = await app.request("/api/v1/agent/tool-audit?limit=15", {
      headers: { ...AUTH, ...TENANT },
    });
    const items = (await audit.json()) as {
      items: Array<{ tool_name: string }>;
    };
    expect(items.items.some((i) => i.tool_name === "tool_simulate")).toBe(true);
  });
});
