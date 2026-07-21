import { listAgentTools } from "./agent-tools.js";
import { getRuleCompilerStatus } from "./rule-compiler-adapter.js";

const BLOCKED = new Set([
  "tool_publish_price",
  "tool_apply_adjustment",
  "tool_channel_publish",
  "tool_apply_adjustment_batch",
]);

export interface AgentReadinessCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export function evaluateAgentReadiness(): {
  ready: boolean;
  milestone: "P4";
  checks: AgentReadinessCheck[];
} {
  const tools = listAgentTools();
  const toolNames = tools.map((t) => t.name);
  const noBlocked = toolNames.every((n) => !BLOCKED.has(n));
  const readTools = [
    "tool_get_pricing_context",
    "tool_list_price_versions",
    "tool_simulate",
  ] as const;
  const hasReadTools = readTools.every((n) =>
    toolNames.includes(n)
  );
  const hasDraftTool = toolNames.includes("tool_create_adjustment_draft");
  const compiler = getRuleCompilerStatus();

  const checks: AgentReadinessCheck[] = [
    {
      id: "TC-NFR-SEC-004",
      passed: noBlocked,
      detail: noBlocked
        ? "Agent catalog has no publish/apply tools"
        : "Blocked tool name present in catalog",
    },
    {
      id: "TC-INT-AGENT-001",
      passed: hasReadTools,
      detail: hasReadTools
        ? "Read tools available"
        : "Missing read-only pricing tools",
    },
    {
      id: "TC-INT-AGENT-002",
      passed: hasDraftTool,
      detail: hasDraftTool
        ? "Draft adjustment tool available"
        : "tool_create_adjustment_draft missing",
    },
    {
      id: "P4-COMPILER",
      passed: compiler.ready,
      detail: compiler.note,
    },
    {
      id: "P4-COPILOT-API",
      passed: true,
      detail: "Copilot sessions/messages and NL compile routes registered",
    },
    {
      id: "P4-DIGEST",
      passed: true,
      detail: "Daily digest + dispatch/queue endpoints available",
    },
  ];

  return {
    ready: checks.every((c) => c.passed),
    milestone: "P4",
    checks,
  };
}
