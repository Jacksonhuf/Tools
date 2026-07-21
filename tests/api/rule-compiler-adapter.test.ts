import { describe, expect, it, afterEach } from "vitest";
import {
  compileRuleViaAdapter,
  getRuleCompilerStatus,
  resolveRuleCompilerDriver,
} from "../../apps/bff/src/rule-compiler-adapter.js";

describe("rule compiler adapter", () => {
  const prev = process.env.RULE_COMPILER_DRIVER;

  afterEach(() => {
    if (prev === undefined) delete process.env.RULE_COMPILER_DRIVER;
    else process.env.RULE_COMPILER_DRIVER = prev;
  });

  it("defaults to heuristic driver", () => {
    delete process.env.RULE_COMPILER_DRIVER;
    expect(resolveRuleCompilerDriver()).toBe("heuristic");
    const out = compileRuleViaAdapter("median -1%", "en");
    expect(out.compiler.driver).toBe("heuristic");
    expect(out.compiler.stub).toBe(false);
  });

  it("llm_stub adds stub metadata and prefix", () => {
    const out = compileRuleViaAdapter(
      "mediana -2% pendiente",
      "es-MX",
      "llm_stub"
    );
    expect(out.compiler.driver).toBe("llm_stub");
    expect(out.compiler.stub).toBe(true);
    expect(out.explanation).toContain("adaptador LLM simulado");
    expect(out.draft.action).toBe("auto_pending");
  });

  it("status reflects env driver", () => {
    process.env.RULE_COMPILER_DRIVER = "llm_stub";
    const status = getRuleCompilerStatus();
    expect(status.driver).toBe("llm_stub");
    expect(status.ready).toBe(true);
  });
});

describe("GET /api/v1/rule-compiler/status", () => {
  it("returns compiler driver info", async () => {
    const { createTestApp } = await import("../../apps/bff/src/app.js");
    const { app } = createTestApp();
    const res = await app.request("/api/v1/rule-compiler/status", {
      headers: {
        Authorization: "Bearer dev-token",
        "X-Tenant-Id": "tenant-demo",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { driver: string; ready: boolean };
    expect(json.driver).toBeTruthy();
    expect(json.ready).toBe(true);
  });
});
