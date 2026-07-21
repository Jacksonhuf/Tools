import {
  compileNaturalLanguageToRuleDraft,
  type DynamicRuleDraft,
} from "./rule-compiler.js";
import { fetchRuleDraftFromLlmEndpoint } from "./llm-rule-compiler-client.js";

export type RuleCompilerDriver = "heuristic" | "llm_stub" | "llm_http";

const DRIVER_ALIASES: Record<string, RuleCompilerDriver> = {
  heuristic: "heuristic",
  keyword: "heuristic",
  llm_stub: "llm_stub",
  llm: "llm_stub",
  llm_http: "llm_http",
  http: "llm_http",
};

export function resolveRuleCompilerDriver(
  raw?: string | null
): RuleCompilerDriver {
  const key = (raw ?? process.env.RULE_COMPILER_DRIVER ?? "heuristic")
    .trim()
    .toLowerCase();
  return DRIVER_ALIASES[key] ?? "heuristic";
}

export function getRuleCompilerStatus() {
  const driver = resolveRuleCompilerDriver();
  const endpoint = process.env.RULE_COMPILER_LLM_ENDPOINT?.trim() || null;
  const llmReady = driver !== "llm_http" || Boolean(endpoint);
  return {
    driver,
    llm_endpoint_configured: Boolean(endpoint),
    llm_model: process.env.RULE_COMPILER_LLM_MODEL?.trim() || null,
    ready:
      driver === "heuristic" ||
      driver === "llm_stub" ||
      (driver === "llm_http" && Boolean(endpoint)),
    llm_ready: llmReady,
    note:
      driver === "heuristic"
        ? "Deterministic keyword parser (no external LLM)."
        : driver === "llm_stub"
          ? "LLM adapter stub — same draft as heuristic with stub metadata until a real provider is wired."
          : endpoint
            ? "HTTP LLM rule compiler (POST RULE_COMPILER_LLM_ENDPOINT)."
            : "llm_http driver requires RULE_COMPILER_LLM_ENDPOINT.",
  };
}

export interface RuleCompileAdapterResult {
  draft: DynamicRuleDraft;
  explanation: string;
  compiler: {
    driver: RuleCompilerDriver;
    model: string | null;
    stub: boolean;
    fallback?: boolean;
  };
}

function heuristicResult(
  text: string,
  locale: string,
  driver: RuleCompilerDriver,
  stub: boolean,
  model: string | null,
  prefix?: string
): RuleCompileAdapterResult {
  const { draft, explanation: baseExplanation } =
    compileNaturalLanguageToRuleDraft(text, locale);
  return {
    draft,
    explanation: prefix ? `${prefix} ${baseExplanation}` : baseExplanation,
    compiler: { driver, model, stub },
  };
}

/** Compile NL strategy through the configured driver (P4 LLM HTTP + stub). */
export async function compileRuleViaAdapter(
  text: string,
  locale: string,
  driverOverride?: RuleCompilerDriver
): Promise<RuleCompileAdapterResult> {
  const driver = driverOverride ?? resolveRuleCompilerDriver();

  if (driver === "llm_http") {
    const model =
      process.env.RULE_COMPILER_LLM_MODEL?.trim() || "mx-pricing-llm-http";
    try {
      const remote = await fetchRuleDraftFromLlmEndpoint(text, locale);
      return {
        draft: remote.draft,
        explanation: remote.explanation,
        compiler: { driver, model, stub: false },
      };
    } catch {
      const fallback = heuristicResult(
        text,
        locale,
        "llm_http",
        false,
        model,
        locale === "es-MX"
          ? "[reserva llm_http]"
          : locale === "zh-CN"
            ? "[llm_http 回退]"
            : "[llm_http fallback]"
      );
      return {
        ...fallback,
        compiler: { driver: "llm_http", model, stub: false, fallback: true },
      };
    }
  }

  if (driver === "llm_stub") {
    const model =
      process.env.RULE_COMPILER_LLM_MODEL?.trim() || "mx-pricing-llm-stub";
    const prefix =
      locale === "es-MX"
        ? "[adaptador LLM simulado]"
        : locale === "zh-CN"
          ? "[LLM 占位适配器]"
          : "[LLM stub adapter]";
    return heuristicResult(text, locale, "llm_stub", true, model, prefix);
  }

  return heuristicResult(text, locale, "heuristic", false, null);
}
