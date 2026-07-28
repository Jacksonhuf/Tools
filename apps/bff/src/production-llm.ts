import { isProductionMode } from "./production-config.js";
import {
  getRuleCompilerStatus,
  resolveRuleCompilerDriver,
} from "./rule-compiler-adapter.js";

export interface ProductionLlmStatus {
  driver: string;
  endpoint_configured: boolean;
  production_required: boolean;
  no_fallback: boolean;
  ready: boolean;
  issues: string[];
}

export function isProductionLlmNoFallback(): boolean {
  const flag = process.env.RULE_COMPILER_PRODUCTION_NO_FALLBACK?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return isProductionMode();
}

export function evaluateProductionLlm(): ProductionLlmStatus {
  const driver = resolveRuleCompilerDriver();
  const status = getRuleCompilerStatus();
  const production_required =
    isProductionMode() && driver === "llm_http";
  const no_fallback = isProductionLlmNoFallback();
  const issues: string[] = [];

  if (production_required) {
    if (!status.llm_endpoint_configured) {
      issues.push("RULE_COMPILER_LLM_ENDPOINT is required for llm_http in production");
    }
    if (!process.env.RULE_COMPILER_LLM_API_KEY?.trim()) {
      issues.push("RULE_COMPILER_LLM_API_KEY is recommended in production");
    }
  }

  const ready =
    !production_required ||
    (status.llm_endpoint_configured && status.ready);

  return {
    driver,
    endpoint_configured: status.llm_endpoint_configured,
    production_required,
    no_fallback,
    ready,
    issues,
  };
}
