import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  needsRuleClarification,
  resetCopilotSessionsForTests,
} from "../../apps/bff/src/copilot-session.js";
import { resetRuleCompilerForTests } from "../../apps/bff/src/rule-compiler.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("needsRuleClarification", () => {
  it("flags vague competitor intent", () => {
    expect(needsRuleClarification("Seguir competidores")).toBe(true);
    expect(
      needsRuleClarification("Seguir competidores mediana -3%")
    ).toBe(false);
  });
});

describe("Copilot multi-turn session", () => {
  beforeEach(() => {
    resetCopilotSessionsForTests();
    resetRuleCompilerForTests();
    const t = createTestApp();
    t.dynamicRules.resetForTests?.();
    t.agentAudit.resetForTests?.();
  });

  it("asks clarification then compiles on follow-up", async () => {
    const { app } = createTestApp();
    const created = await app.request("/api/v1/agent/copilot/sessions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ listing_id: "listing-ml-001" }),
    });
    expect(created.status).toBe(200);
    const { session_id } = (await created.json()) as { session_id: string };

    const turn1 = await app.request(
      `/api/v1/agent/copilot/sessions/${session_id}/messages`,
      {
        method: "POST",
        headers: { ...JSON_HEADERS, "Accept-Language": "es-MX" },
        body: JSON.stringify({
          listing_id: "listing-ml-001",
          content: "Seguir competidores",
        }),
      }
    );
    expect(turn1.status).toBe(200);
    const r1 = (await turn1.json()) as {
      needs_clarification: boolean;
      compile_id?: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(r1.needs_clarification).toBe(true);
    expect(r1.compile_id).toBeUndefined();
    expect(r1.messages.at(-1)?.role).toBe("assistant");

    const turn2 = await app.request(
      `/api/v1/agent/copilot/sessions/${session_id}/messages`,
      {
        method: "POST",
        headers: { ...JSON_HEADERS, "Accept-Language": "es-MX" },
        body: JSON.stringify({
          listing_id: "listing-ml-001",
          content: "mediana -3% auto pending",
        }),
      }
    );
    expect(turn2.status).toBe(200);
    const r2 = (await turn2.json()) as {
      needs_clarification: boolean;
      compile_id: string;
      draft: { action: string; offset: { value: number } };
    };
    expect(r2.needs_clarification).toBe(false);
    expect(r2.compile_id).toMatch(/^compile-/);
    expect(r2.draft.action).toBe("auto_pending");
    expect(r2.draft.offset.value).toBe(-3);

    const audit = await app.request("/api/v1/agent/tool-audit?limit=5", {
      headers: { ...AUTH, ...TENANT },
    });
    const items = (await audit.json()) as {
      items: Array<{ tool_name: string; session_id: string | null }>;
    };
    expect(items.items.some((i) => i.tool_name === "tool_copilot_turn")).toBe(
      true
    );
    expect(
      items.items.some(
        (i) => i.tool_name === "tool_copilot_turn" && i.session_id === session_id
      )
    ).toBe(true);
  });
});
