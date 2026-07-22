import type { evaluateAgentReadiness } from "./agent-readiness.js";

type AgentReadinessSnapshot = ReturnType<typeof evaluateAgentReadiness>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function agentReadinessToCsv(
  snapshot: AgentReadinessSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,ready,milestone,check_id,passed,detail",
  ];
  for (const check of snapshot.checks) {
    lines.push(
      [
        exportedAt,
        snapshot.ready ? "true" : "false",
        cell(snapshot.milestone),
        cell(check.id),
        check.passed ? "true" : "false",
        cell(check.detail),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
