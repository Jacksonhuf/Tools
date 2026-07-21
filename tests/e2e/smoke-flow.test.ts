/**
 * TC-E2E smoke scaffold (API-backed, no Playwright) — ci-e2e-smoke placeholder.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  resetCopilotSessionsForTests,
} from "../../apps/bff/src/copilot-session.js";
import { resetRuleCompilerForTests } from "../../apps/bff/src/rule-compiler.js";
import { resetDigestJobQueueForTests } from "../../apps/bff/src/digest-job-queue.js";
import { resetDigestDispatchForTests } from "../../apps/bff/src/agent-digest-dispatch.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-E2E smoke flow (API)", () => {
  beforeEach(() => {
    resetCopilotSessionsForTests();
    resetRuleCompilerForTests();
    resetDigestJobQueueForTests();
    resetDigestDispatchForTests();
    const t = createTestApp();
    t.dynamicRules.resetForTests?.();
    t.agentAudit.resetForTests?.();
  });

  it("pricing context → copilot → compile confirm → P4 readiness", async () => {
    const { app, dynamicRules } = createTestApp();

    const health = await app.request("/health");
    expect(health.status).toBe(200);

    const ctx = await app.request(
      "/api/v1/skus/demo-sku-001/pricing-context",
      {
        headers: { ...AUTH, ...TENANT, "Accept-Language": "es-MX" },
      }
    );
    expect(ctx.status).toBe(200);

    const session = await app.request("/api/v1/agent/copilot/sessions", {
      method: "POST",
      headers: { ...JSON_HEADERS, "Accept-Language": "es-MX" },
      body: JSON.stringify({
        listing_id: "listing-ml-001",
        sku_id: "demo-sku-001",
        channel: "MERCADO_LIBRE",
        bootstrap_context: true,
      }),
    });
    expect(session.status).toBe(200);

    const nl =
      "Usar mediana -2% con acción pendiente para competidores";
    const compile = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule/compile",
      {
        method: "POST",
        headers: { ...JSON_HEADERS, "Accept-Language": "es-MX" },
        body: JSON.stringify({ natural_language: nl }),
      }
    );
    expect(compile.status).toBe(200);
    const compiled = (await compile.json()) as { compile_id: string };
    expect(compiled.compile_id).toMatch(/^compile-/);

    const confirm = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule/confirm-compiled",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ compile_id: compiled.compile_id }),
      }
    );
    expect(confirm.status).toBe(200);
    const rule = await dynamicRules.getRule("listing-ml-001");
    expect(rule?.anchor_type).toBe("median");

    const ready = await app.request("/api/v1/agent/readiness", {
      headers: { ...AUTH, ...TENANT },
    });
    const readiness = (await ready.json()) as { ready: boolean };
    expect(readiness.ready).toBe(true);

    await app.request("/api/v1/agent/digest/daily/enqueue", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ channels: ["email_stub"] }),
    });
    const proc = await app.request("/api/v1/agent/digest/jobs/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ limit: 1 }),
    });
    expect(proc.status).toBe(200);
  });
});
