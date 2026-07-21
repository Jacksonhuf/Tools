import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-NFR-SEC-004 agent tool catalog", () => {
  it("lists tools without publish or apply", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/tools", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ name: string }> };
    const names = body.items.map((i) => i.name);
    expect(names).toContain("tool_get_pricing_context");
    expect(names).toContain("tool_simulate");
    expect(names).not.toContain("tool_publish_price");
    expect(names).not.toContain("tool_apply_adjustment");
    const blocked = await app.request("/api/v1/agent/tools/invoke", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        tool: "tool_publish_price",
        arguments: {},
      }),
    });
    expect(blocked.status).toBe(400);
  });
});

describe("TC-INT-AGENT-001 tool_get_pricing_context", () => {
  it("matches GET pricing-context payload", async () => {
    const { app } = createTestApp();
    const direct = await app.request(
      "/api/v1/skus/demo-sku-001/pricing-context?channel=MERCADO_LIBRE",
      { headers: { ...AUTH, ...TENANT, "Accept-Language": "en" } }
    );
    const tool = await app.request("/api/v1/agent/tools/invoke", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        tool: "tool_get_pricing_context",
        session_id: "sess-001",
        arguments: {
          sku_id: "demo-sku-001",
          channel: "MERCADO_LIBRE",
        },
      }),
    });
    expect(tool.status).toBe(200);
    const toolBody = (await tool.json()) as {
      tool: string;
      audit_id: string;
      result: { sku: { sku_code: string } };
    };
    const directBody = (await direct.json()) as { sku: { sku_code: string } };
    expect(toolBody.tool).toBe("tool_get_pricing_context");
    expect(toolBody.result.sku.sku_code).toBe(directBody.sku.sku_code);
    expect(toolBody.audit_id).toMatch(/^agent-audit-/);
  });
});

describe("TC-INT-AGENT-002 tool_create_adjustment_draft", () => {
  it("creates draft batch without apply", async () => {
    const { app } = createTestApp();
    const invoke = await app.request("/api/v1/agent/tools/invoke", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        tool: "tool_create_adjustment_draft",
        arguments: {
          reason_code: "agent-demo",
          items: [
            {
              listing_id: "listing-ml-001",
              explicit_price_mxn: 1650,
            },
          ],
        },
      }),
    });
    expect(invoke.status).toBe(200);
    const body = (await invoke.json()) as {
      result: { status: string; id: string };
    };
    expect(["draft", "pending_approval"]).toContain(body.result.status);
    const batch = await app.request(
      `/api/v1/adjustment-batches/${body.result.id}`,
      { headers: { ...AUTH, ...TENANT } }
    );
    const detail = (await batch.json()) as { status: string };
    expect(detail.status).toBe(body.result.status);
    expect(detail.status).not.toBe("applied");
  });
});

describe("TC-INT-AGENT-004 tool invocation audit", () => {
  it("records each invoke in tool-audit log", async () => {
    const { app, agentAudit } = createTestApp();
    agentAudit.resetForTests?.();
    await app.request("/api/v1/agent/tools/invoke", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        tool: "tool_simulate",
        session_id: "sess-audit",
        arguments: {
          sku_id: "demo-sku-001",
          channel: "MERCADO_LIBRE",
          pricing_mode: "cost",
          target_margin_pct: 20,
        },
      }),
    });
    const audit = await app.request("/api/v1/agent/tool-audit", {
      headers: { ...AUTH, ...TENANT },
    });
    const list = (await audit.json()) as {
      items: Array<{ tool_name: string; session_id: string }>;
    };
    expect(list.items.length).toBeGreaterThanOrEqual(1);
    expect(list.items[0].tool_name).toBe("tool_simulate");
    expect(list.items[0].session_id).toBe("sess-audit");
  });
});
