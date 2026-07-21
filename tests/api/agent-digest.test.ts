import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetCopilotSessionsForTests } from "../../apps/bff/src/copilot-session.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("GET /api/v1/agent/digest/daily", () => {
  beforeEach(() => {
    resetCopilotSessionsForTests();
  });

  it("returns tenant digest metrics", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/agent/digest/daily?date=2026-07-21",
      {
        headers: { ...AUTH, ...TENANT, "Accept-Language": "zh-CN" },
      }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      date: string;
      narrative: string;
      metrics: { sku_count: number };
      queue_highlights: unknown[];
    };
    expect(json.date).toBe("2026-07-21");
    expect(json.metrics.sku_count).toBeGreaterThan(0);
    expect(json.narrative).toContain("2026-07-21");
    expect(Array.isArray(json.queue_highlights)).toBe(true);
  });
});

describe("Copilot session context bootstrap", () => {
  beforeEach(() => {
    resetCopilotSessionsForTests();
    const t = createTestApp();
    t.agentAudit.resetForTests?.();
  });

  it("bootstraps welcome + pricing narrative and audits tool", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/copilot/sessions", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "en" },
      body: JSON.stringify({
        listing_id: "listing-ml-001",
        sku_id: "demo-sku-001",
        channel: "MERCADO_LIBRE",
        bootstrap_context: true,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      context_bootstrapped: boolean;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.context_bootstrapped).toBe(true);
    expect(body.messages.length).toBeGreaterThanOrEqual(2);
    expect(body.messages[0].role).toBe("assistant");
    expect(body.messages.some((m) => /Pricing context|定价上下文|Contexto de precios/.test(m.content))).toBe(
      true
    );

    const audit = await app.request("/api/v1/agent/tool-audit?limit=10", {
      headers: { ...AUTH, ...TENANT },
    });
    const items = (await audit.json()) as {
      items: Array<{ tool_name: string }>;
    };
    expect(
      items.items.some((i) => i.tool_name === "tool_get_pricing_context")
    ).toBe(true);
  });
});
