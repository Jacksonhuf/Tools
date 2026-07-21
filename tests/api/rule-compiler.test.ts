import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  compileNaturalLanguageToRuleDraft,
  resetRuleCompilerForTests,
} from "../../apps/bff/src/rule-compiler.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("rule compiler mock", () => {
  it("parses Spanish strategy text", () => {
    const { draft } = compileNaturalLanguageToRuleDraft(
      "Seguir mediana con -2% y pasar a pendiente en horario hábil",
      "es-MX"
    );
    expect(draft.anchor_type).toBe("median");
    expect(draft.offset).toEqual({ type: "PERCENT", value: -2 });
    expect(draft.action).toBe("auto_pending");
    expect(draft.business_hours_only).toBe(true);
  });
});

describe("TC-E2E-AGENT-003 NL compile confirm flow", () => {
  beforeEach(() => {
    resetRuleCompilerForTests();
    const t = createTestApp();
    t.dynamicRules.resetForTests?.();
    t.agentAudit.resetForTests?.();
  });

  it("does not persist rule until confirm-compiled", async () => {
    const { app, dynamicRules } = createTestApp();
    const nl =
      "Usar mediana -3% con acción pendiente para competidores en ML";
    const compile = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule/compile",
      {
        method: "POST",
        headers: { ...JSON_HEADERS, "Accept-Language": "es-MX" },
        body: JSON.stringify({ natural_language: nl }),
      }
    );
    expect(compile.status).toBe(200);
    const compiled = (await compile.json()) as {
      compile_id: string;
      persisted: boolean;
      draft: { action: string; offset: { value: number } };
    };
    expect(compiled.persisted).toBe(false);
    expect(compiled.draft.action).toBe("auto_pending");
    expect(compiled.draft.offset.value).toBe(-3);

    const before = await dynamicRules.getRule("listing-ml-001");
    expect(before).toBeUndefined();

    const confirm = await app.request(
      "/api/v1/listings/listing-ml-001/dynamic-repricing-rule/confirm-compiled",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ compile_id: compiled.compile_id }),
      }
    );
    expect(confirm.status).toBe(200);
    const saved = (await confirm.json()) as {
      persisted: boolean;
      rule: { action: string; anchor_type: string };
    };
    expect(saved.persisted).toBe(true);
    expect(saved.rule.action).toBe("auto_pending");
    expect(saved.rule.anchor_type).toBe("median");

    const after = await dynamicRules.getRule("listing-ml-001");
    expect(after?.action).toBe("auto_pending");
  });
});
