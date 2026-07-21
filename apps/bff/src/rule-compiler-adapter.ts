import {
  compileNaturalLanguageToRuleDraft,
  type DynamicRuleDraft,
} from "./rule-compiler.js";

export type RuleCompilerDriver = "heuristic" | "llm_stub";

const DRIVER_ALIASES: Record<string, RuleCompilerDriver> = {
  heuristic: "heuristic",
  keyword: "heuristic",
  llm_stub: "llm_stub",
  llm: "llm_stub",
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
  return {
    driver,
    llm_endpoint_configured: Boolean(endpoint),
    llm_model: process.env.RULE_COMPILER_LLM_MODEL?.trim() || null,
    ready: driver === "heuristic" || driver === "llm_stub",
    note:
      driver === "heuristic"
        ? "Deterministic keyword parser (no external LLM)."
        : "LLM adapter stub — same draft as heuristic with stub metadata until a real provider is wired.",
  };
}

export interface RuleCompileAdapterResult {
  draft: DynamicRuleDraft;
  explanation: string;
  compiler: {
    driver: RuleCompilerDriver;
    model: string | null;
    stub: boolean;
  };
}

/** Compile NL strategy through the configured driver (P4 LLM placeholder). */
export function compileRuleViaAdapter(
  text: string,
  locale: string,
  driverOverride?: RuleCompilerDriver
): RuleCompileAdapterResult {
  const driver = driverOverride ?? resolveRuleCompilerDriver();
  const { draft, explanation: baseExplanation } =
    compileNaturalLanguageToRuleDraft(text, locale);

  if (driver === "llm_stub") {
    const model =
      process.env.RULE_COMPILER_LLM_MODEL?.trim() || "mx-pricing-llm-stub";
    const prefix =
      locale === "es-MX"
        ? "[adaptador LLM simulado]"
        : locale === "zh-CN"
          ? "[LLM 占位适配器]"
          : "[LLM stub adapter]";
    return {
      draft,
      explanation: `${prefix} ${baseExplanation}`,
      compiler: { driver, model, stub: true },
    };
  }

  return {
    draft,
    explanation: baseExplanation,
    compiler: { driver: "heuristic", model: null, stub: false },
  };
}
