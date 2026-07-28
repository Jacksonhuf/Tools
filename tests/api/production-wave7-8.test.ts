import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import {
  evaluateProductionLlm,
  isProductionLlmNoFallback,
} from "../../apps/bff/src/production-llm.js";
import { evaluateGoLiveReadiness } from "../../apps/bff/src/go-live-readiness.js";
import { compileRuleViaAdapter } from "../../apps/bff/src/rule-compiler-adapter.js";

describe("production LLM readiness", () => {
  it("defaults to no-fallback only in production mode", () => {
    expect(isProductionLlmNoFallback()).toBe(false);
    const status = evaluateProductionLlm();
    expect(status.driver).toBeDefined();
  });
});

describe("GET /api/v1/production/readiness (Wave 7)", () => {
  it("includes rule_compiler and production_llm blocks", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/production/readiness", {
      headers: {
        Authorization: "Bearer dev-token",
        "X-Tenant-Id": "tenant-demo",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      rule_compiler: { driver: string };
      production_llm: { ready: boolean };
    };
    expect(json.rule_compiler.driver).toBeDefined();
    expect(json.production_llm.ready).toBe(true);
  });
});

describe("GET /api/v1/production/go-live (Wave 8)", () => {
  it("returns go-live checklist with GL golden gate", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/production/go-live", {
      headers: {
        Authorization: "Bearer dev-token",
        "X-Tenant-Id": "tenant-demo",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ready: boolean;
      milestone: string;
      checks: { id: string; passed: boolean }[];
    };
    expect(json.milestone).toBe("GO-LIVE");
    const golden = json.checks.find((c) => c.id === "GL-GOLDEN-MANIFEST");
    expect(golden?.passed).toBe(true);
    expect(evaluateGoLiveReadiness().checks.length).toBeGreaterThanOrEqual(6);
  });
});

describe("llm_http production no-fallback", () => {
  it("throws when HTTP fails and RULE_COMPILER_PRODUCTION_NO_FALLBACK=true", async () => {
    const prevDriver = process.env.RULE_COMPILER_DRIVER;
    const prevEndpoint = process.env.RULE_COMPILER_LLM_ENDPOINT;
    const prevNoFallback = process.env.RULE_COMPILER_PRODUCTION_NO_FALLBACK;
    process.env.RULE_COMPILER_DRIVER = "llm_http";
    process.env.RULE_COMPILER_LLM_ENDPOINT = "https://llm.example/compile";
    process.env.RULE_COMPILER_PRODUCTION_NO_FALLBACK = "true";
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 503 }) as Response;
    try {
      await expect(
        compileRuleViaAdapter("median -2%", "en", "llm_http")
      ).rejects.toBeDefined();
    } finally {
      globalThis.fetch = prevFetch;
      if (prevDriver === undefined) delete process.env.RULE_COMPILER_DRIVER;
      else process.env.RULE_COMPILER_DRIVER = prevDriver;
      if (prevEndpoint === undefined) delete process.env.RULE_COMPILER_LLM_ENDPOINT;
      else process.env.RULE_COMPILER_LLM_ENDPOINT = prevEndpoint;
      if (prevNoFallback === undefined) {
        delete process.env.RULE_COMPILER_PRODUCTION_NO_FALLBACK;
      } else {
        process.env.RULE_COMPILER_PRODUCTION_NO_FALLBACK = prevNoFallback;
      }
    }
  });
});
