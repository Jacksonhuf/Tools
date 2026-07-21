import { describe, expect, it, afterEach, vi } from "vitest";
import { parseLlmRuleCompilerResponse } from "../../apps/bff/src/llm-rule-compiler-client.js";
import { compileRuleViaAdapter } from "../../apps/bff/src/rule-compiler-adapter.js";

describe("parseLlmRuleCompilerResponse", () => {
  it("accepts valid draft JSON", () => {
    const parsed = parseLlmRuleCompilerResponse({
      explanation: "From LLM",
      draft: {
        enabled: true,
        action: "auto_pending",
        anchor_type: "median",
        offset: { type: "PERCENT", value: -4 },
        min_gap_mxn: 5,
        cooldown_min: 0,
        daily_limit: 10,
        business_hours_only: false,
      },
    });
    expect(parsed?.draft.offset.value).toBe(-4);
    expect(parsed?.explanation).toBe("From LLM");
  });

  it("rejects invalid action", () => {
    expect(
      parseLlmRuleCompilerResponse({
        draft: { action: "publish", offset: { type: "PERCENT", value: 1 } },
      })
    ).toBeNull();
  });
});

describe("llm_http driver", () => {
  const prevDriver = process.env.RULE_COMPILER_DRIVER;
  const prevEndpoint = process.env.RULE_COMPILER_LLM_ENDPOINT;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevDriver === undefined) delete process.env.RULE_COMPILER_DRIVER;
    else process.env.RULE_COMPILER_DRIVER = prevDriver;
    if (prevEndpoint === undefined) delete process.env.RULE_COMPILER_LLM_ENDPOINT;
    else process.env.RULE_COMPILER_LLM_ENDPOINT = prevEndpoint;
  });

  it("uses HTTP response when endpoint succeeds", async () => {
    process.env.RULE_COMPILER_DRIVER = "llm_http";
    process.env.RULE_COMPILER_LLM_ENDPOINT = "https://llm.example/compile";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          explanation: "remote",
          draft: {
            enabled: true,
            action: "suggest",
            anchor_type: "min",
            offset: { type: "PERCENT", value: -1 },
            min_gap_mxn: 5,
            cooldown_min: 0,
            daily_limit: 10,
            business_hours_only: false,
          },
        }),
      }))
    );
    const out = await compileRuleViaAdapter("anything", "en", "llm_http");
    expect(out.compiler.driver).toBe("llm_http");
    expect(out.draft.anchor_type).toBe("min");
    expect(out.explanation).toBe("remote");
  });

  it("falls back to heuristic when HTTP fails", async () => {
    process.env.RULE_COMPILER_DRIVER = "llm_http";
    process.env.RULE_COMPILER_LLM_ENDPOINT = "https://llm.example/compile";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 }))
    );
    const out = await compileRuleViaAdapter("median -2%", "en", "llm_http");
    expect(out.compiler.fallback).toBe(true);
    expect(out.draft.anchor_type).toBe("median");
    expect(out.explanation).toContain("fallback");
  });
});
